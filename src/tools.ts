/**
 * SignForge MCP tool definitions and handlers.
 */

import { apiRequest, downloadDocument, readPdfAsBase64 } from "./client.js";

// ── Type definitions ──

interface QuickSignResult {
  envelope_id: string;
  signing_url: string | null;
  status: string;
}

interface EnvelopeResult {
  id: string;
  title: string;
  status: string;
  is_sandbox: boolean;
  created_at: string;
  updated_at: string;
  recipients: Array<{
    id: string;
    email: string;
    name: string;
    status: string;
    signed_at: string | null;
  }>;
  documents: Array<{
    kind: string;
    download_url: string;
  }>;
}

interface EnvelopeListResult {
  envelopes: EnvelopeResult[];
  total: number;
  offset: number;
  limit: number;
}

interface WebhookResult {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
  description?: string;
  created_at: string;
}

interface WebhookListResult {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  description?: string;
  created_at: string;
}

interface EmbedUrlResult {
  embed_url: string;
  token_expires_at?: string;
}

interface TemplateResult {
  id: string;
  title: string;
  description?: string;
  page_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
  fields?: Array<{
    id: string;
    field_type: string;
    recipient_index: number;
    page_index: number;
    label?: string;
    default_value?: string;
    required: boolean;
  }>;
}

interface TemplateListResult {
  templates: TemplateResult[];
  total: number;
}

// ── Tool definitions (MCP schema) ──

export const toolDefinitions = [
  // ── Existing tools ──
  {
    name: "create_and_send",
    description:
      "Create an envelope with a PDF document, add a signer, and send it for e-signature. " +
      "Returns the envelope ID and a signing URL. Provide either a local file path (pdf_path) " +
      "or base64-encoded PDF content (pdf_base64).",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title for the envelope (e.g. 'NDA Agreement')",
        },
        signer_email: {
          type: "string",
          description: "Email address of the person who needs to sign",
        },
        signer_name: {
          type: "string",
          description: "Full name of the signer",
        },
        pdf_path: {
          type: "string",
          description: "Local file path to the PDF document (alternative to pdf_base64)",
        },
        pdf_base64: {
          type: "string",
          description: "Base64-encoded PDF content (alternative to pdf_path)",
        },
      },
      required: ["title", "signer_email", "signer_name"],
    },
  },
  {
    name: "check_status",
    description:
      "Check the current status of an envelope. Returns the envelope details including " +
      "recipient signing status, document availability, and timestamps.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the envelope to check",
        },
      },
      required: ["envelope_id"],
    },
  },
  {
    name: "download_signed",
    description:
      "Download the signed PDF document for a completed envelope. " +
      "The envelope must be in 'completed' status. Saves the file to the specified output path.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the completed envelope",
        },
        output_path: {
          type: "string",
          description: "Local file path where the signed PDF should be saved",
        },
      },
      required: ["envelope_id", "output_path"],
    },
  },
  {
    name: "list_envelopes",
    description:
      "List your envelopes with optional filtering by status. " +
      "Returns envelope summaries including titles, statuses, and recipient information.",
    inputSchema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["draft", "sent", "completed", "voided", "expired"],
          description: "Filter by envelope status (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum number of envelopes to return (default: 10, max: 100)",
        },
      },
    },
  },

  // ── New tools ──
  {
    name: "send_envelope",
    description:
      "Send a draft envelope for signing. The envelope must be in 'draft' status " +
      "with at least one recipient and one field configured.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the draft envelope to send",
        },
      },
      required: ["envelope_id"],
    },
  },
  {
    name: "void_envelope",
    description:
      "Void (cancel) an active envelope. The envelope must be in 'sent' status. " +
      "All pending signatures will be cancelled and signers will be notified.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the envelope to void",
        },
        reason: {
          type: "string",
          description: "Reason for voiding the envelope (optional)",
        },
      },
      required: ["envelope_id"],
    },
  },
  {
    name: "delete_envelope",
    description:
      "Permanently delete an envelope. Only draft and voided envelopes can be deleted.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the envelope to delete",
        },
      },
      required: ["envelope_id"],
    },
  },
  {
    name: "download_certificate",
    description:
      "Download the audit certificate PDF for a completed envelope. " +
      "The certificate contains the full audit trail with timestamps and IP addresses.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the completed envelope",
        },
        output_path: {
          type: "string",
          description: "Local file path where the certificate PDF should be saved",
        },
      },
      required: ["envelope_id", "output_path"],
    },
  },
  {
    name: "download_archive",
    description:
      "Download a ZIP archive containing the signed PDF, audit certificate, " +
      "and all related documents for a completed envelope.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the completed envelope",
        },
        output_path: {
          type: "string",
          description: "Local file path where the ZIP archive should be saved",
        },
      },
      required: ["envelope_id", "output_path"],
    },
  },
  {
    name: "get_embed_url",
    description:
      "Generate an embeddable signing URL for an envelope. " +
      "This URL can be embedded in an iframe for in-app signing experiences.",
    inputSchema: {
      type: "object" as const,
      properties: {
        envelope_id: {
          type: "string",
          description: "The UUID of the envelope",
        },
        recipient_id: {
          type: "string",
          description: "The UUID of the recipient to generate the embed URL for (optional, defaults to first recipient)",
        },
      },
      required: ["envelope_id"],
    },
  },
  {
    name: "create_webhook",
    description:
      "Create a webhook to receive real-time notifications for envelope events. " +
      "Events include: envelope.sent, envelope.viewed, envelope.signed, envelope.completed, " +
      "envelope.expired, envelope.voided, envelope.declined.",
    inputSchema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The HTTPS URL that will receive webhook POST requests",
        },
        events: {
          type: "array",
          items: { type: "string" },
          description:
            "List of event types to subscribe to (e.g. ['envelope.completed', 'envelope.signed'])",
        },
        description: {
          type: "string",
          description: "Optional description for this webhook",
        },
      },
      required: ["url", "events"],
    },
  },
  {
    name: "list_webhooks",
    description: "List all configured webhooks for your account.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "delete_webhook",
    description: "Delete a webhook by its ID. The webhook will stop receiving events immediately.",
    inputSchema: {
      type: "object" as const,
      properties: {
        webhook_id: {
          type: "string",
          description: "The UUID of the webhook to delete",
        },
      },
      required: ["webhook_id"],
    },
  },
  {
    name: "list_templates",
    description:
      "List your reusable document templates. Templates contain pre-placed fields " +
      "and can be used to quickly create envelopes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "Search templates by title (optional)",
        },
        limit: {
          type: "number",
          description: "Maximum number of templates to return (default: 50, max: 100)",
        },
      },
    },
  },
  {
    name: "create_from_template",
    description:
      "Create an envelope from a template. Optionally pre-fill field values and " +
      "send immediately. The template's fields will be mapped to the provided recipients.",
    inputSchema: {
      type: "object" as const,
      properties: {
        template_id: {
          type: "string",
          description: "The UUID of the template to use",
        },
        recipients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string", description: "Recipient email address" },
              name: { type: "string", description: "Recipient full name" },
            },
            required: ["email"],
          },
          description: "List of recipients for the envelope",
        },
        prefill_fields: {
          type: "object",
          description:
            "Map of field label or template_field UUID to pre-fill value (optional)",
        },
        title: {
          type: "string",
          description: "Custom title for the envelope (defaults to template title)",
        },
        send_immediately: {
          type: "boolean",
          description: "Send the envelope immediately after creation (default: false)",
        },
      },
      required: ["template_id", "recipients"],
    },
  },
];

// ── Tool handlers ──

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "create_and_send":
        return await handleCreateAndSend(args);
      case "check_status":
        return await handleCheckStatus(args);
      case "download_signed":
        return await handleDownloadSigned(args);
      case "list_envelopes":
        return await handleListEnvelopes(args);
      case "send_envelope":
        return await handleSendEnvelope(args);
      case "void_envelope":
        return await handleVoidEnvelope(args);
      case "delete_envelope":
        return await handleDeleteEnvelope(args);
      case "download_certificate":
        return await handleDownloadCertificate(args);
      case "download_archive":
        return await handleDownloadArchive(args);
      case "get_embed_url":
        return await handleGetEmbedUrl(args);
      case "create_webhook":
        return await handleCreateWebhook(args);
      case "list_webhooks":
        return await handleListWebhooks(args);
      case "delete_webhook":
        return await handleDeleteWebhook(args);
      case "list_templates":
        return await handleListTemplates(args);
      case "create_from_template":
        return await handleCreateFromTemplate(args);
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResult(`Error: ${message}`);
  }
}

// ── Existing handlers ──

async function handleCreateAndSend(args: Record<string, unknown>) {
  const { title, signer_email, signer_name, pdf_path, pdf_base64 } = args as {
    title: string;
    signer_email: string;
    signer_name: string;
    pdf_path?: string;
    pdf_base64?: string;
  };

  let pdfContent: string;
  if (pdf_path) {
    pdfContent = readPdfAsBase64(pdf_path);
  } else if (pdf_base64) {
    pdfContent = pdf_base64;
  } else {
    return errorResult("Either pdf_path or pdf_base64 must be provided.");
  }

  const result = await apiRequest<QuickSignResult>("/quick-sign", {
    method: "POST",
    body: {
      title,
      pdf_base64: pdfContent,
      signer_email,
      signer_name,
      send: true,
    },
  });

  let text = `Envelope created and sent successfully!\n\n`;
  text += `- Envelope ID: ${result.envelope_id}\n`;
  text += `- Status: ${result.status}\n`;
  if (result.signing_url) {
    text += `- Signing URL: ${result.signing_url}\n`;
  }
  text += `\nThe signer (${signer_email}) will receive an email with a link to sign the document.`;

  return textResult(text);
}

async function handleCheckStatus(args: Record<string, unknown>) {
  const { envelope_id } = args as { envelope_id: string };

  const result = await apiRequest<EnvelopeResult>(`/envelopes/${envelope_id}`);

  let text = `Envelope: ${result.title}\n`;
  text += `Status: ${result.status}\n`;
  text += `Created: ${new Date(result.created_at).toLocaleString()}\n`;
  if (result.is_sandbox) text += `Mode: Sandbox (test)\n`;
  text += `\nRecipients:\n`;

  for (const r of result.recipients) {
    text += `  - ${r.name} (${r.email}): ${r.status}`;
    if (r.signed_at) text += ` (signed ${new Date(r.signed_at).toLocaleString()})`;
    text += "\n";
  }

  if (result.documents.length > 0) {
    text += `\nDocuments available:\n`;
    for (const d of result.documents) {
      text += `  - ${d.kind}\n`;
    }
  }

  return textResult(text);
}

async function handleDownloadSigned(args: Record<string, unknown>) {
  const { envelope_id, output_path } = args as { envelope_id: string; output_path: string };

  const savedPath = await downloadDocument(`/envelopes/${envelope_id}/documents/signed`, output_path);

  return textResult(`Signed PDF downloaded successfully to: ${savedPath}`);
}

async function handleListEnvelopes(args: Record<string, unknown>) {
  const { status, limit } = args as { status?: string; limit?: number };

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit || 10));

  const result = await apiRequest<EnvelopeListResult>(`/envelopes?${params.toString()}`);

  if (result.envelopes.length === 0) {
    return textResult("No envelopes found.");
  }

  let text = `Found ${result.total} envelope(s)`;
  if (status) text += ` with status "${status}"`;
  text += `:\n\n`;

  for (const e of result.envelopes) {
    text += `- ${e.title} [${e.status}] (ID: ${e.id})\n`;
    for (const r of e.recipients) {
      text += `    Signer: ${r.name} (${r.email}) — ${r.status}\n`;
    }
  }

  return textResult(text);
}

// ── New handlers ──

async function handleSendEnvelope(args: Record<string, unknown>) {
  const { envelope_id } = args as { envelope_id: string };

  const result = await apiRequest<EnvelopeResult>(`/envelopes/${envelope_id}/send`, {
    method: "POST",
  });

  let text = `Envelope sent successfully!\n\n`;
  text += `- Envelope ID: ${result.id}\n`;
  text += `- Title: ${result.title}\n`;
  text += `- Status: ${result.status}\n`;
  text += `\nRecipients:\n`;
  for (const r of result.recipients) {
    text += `  - ${r.name} (${r.email}): ${r.status}\n`;
  }

  return textResult(text);
}

async function handleVoidEnvelope(args: Record<string, unknown>) {
  const { envelope_id, reason } = args as { envelope_id: string; reason?: string };

  const body: Record<string, unknown> = {};
  if (reason) body.reason = reason;

  const result = await apiRequest<EnvelopeResult>(`/envelopes/${envelope_id}/void`, {
    method: "POST",
    body,
  });

  return textResult(
    `Envelope voided successfully.\n\n- Envelope ID: ${result.id}\n- Title: ${result.title}\n- Status: ${result.status}`
  );
}

async function handleDeleteEnvelope(args: Record<string, unknown>) {
  const { envelope_id } = args as { envelope_id: string };

  await apiRequest(`/envelopes/${envelope_id}`, { method: "DELETE" });

  return textResult(`Envelope ${envelope_id} deleted successfully.`);
}

async function handleDownloadCertificate(args: Record<string, unknown>) {
  const { envelope_id, output_path } = args as { envelope_id: string; output_path: string };

  const savedPath = await downloadDocument(
    `/envelopes/${envelope_id}/documents/certificate`,
    output_path
  );

  return textResult(`Audit certificate downloaded successfully to: ${savedPath}`);
}

async function handleDownloadArchive(args: Record<string, unknown>) {
  const { envelope_id, output_path } = args as { envelope_id: string; output_path: string };

  const savedPath = await downloadDocument(
    `/envelopes/${envelope_id}/archive`,
    output_path
  );

  return textResult(`Archive downloaded successfully to: ${savedPath}`);
}

async function handleGetEmbedUrl(args: Record<string, unknown>) {
  const { envelope_id, recipient_id } = args as {
    envelope_id: string;
    recipient_id?: string;
  };

  const body: Record<string, unknown> = {};
  if (recipient_id) body.recipient_id = recipient_id;

  const result = await apiRequest<EmbedUrlResult>(
    `/envelopes/${envelope_id}/embed-url`,
    { method: "POST", body }
  );

  let text = `Embed URL generated successfully!\n\n`;
  text += `- URL: ${result.embed_url}\n`;
  if (result.token_expires_at) {
    text += `- Expires: ${new Date(result.token_expires_at).toLocaleString()}\n`;
  }
  text += `\nEmbed this URL in an iframe for in-app signing.`;

  return textResult(text);
}

async function handleCreateWebhook(args: Record<string, unknown>) {
  const { url, events, description } = args as {
    url: string;
    events: string[];
    description?: string;
  };

  const body: Record<string, unknown> = { url, events };
  if (description) body.description = description;

  const result = await apiRequest<WebhookResult>("/webhooks", {
    method: "POST",
    body,
  });

  let text = `Webhook created successfully!\n\n`;
  text += `- Webhook ID: ${result.id}\n`;
  text += `- URL: ${result.url}\n`;
  text += `- Events: ${result.events.join(", ")}\n`;
  if (result.secret) {
    text += `- Signing Secret: ${result.secret}\n`;
    text += `  (Save this secret! It won't be shown again.)\n`;
  }

  return textResult(text);
}

async function handleListWebhooks(_args: Record<string, unknown>) {
  const result = await apiRequest<WebhookListResult[]>("/webhooks");

  if (!result || result.length === 0) {
    return textResult("No webhooks configured.");
  }

  let text = `Found ${result.length} webhook(s):\n\n`;
  for (const w of result) {
    text += `- ${w.url} [${w.is_active ? "active" : "inactive"}] (ID: ${w.id})\n`;
    text += `  Events: ${w.events.join(", ")}\n`;
    if (w.description) text += `  Description: ${w.description}\n`;
  }

  return textResult(text);
}

async function handleDeleteWebhook(args: Record<string, unknown>) {
  const { webhook_id } = args as { webhook_id: string };

  await apiRequest(`/webhooks/${webhook_id}`, { method: "DELETE" });

  return textResult(`Webhook ${webhook_id} deleted successfully.`);
}

async function handleListTemplates(args: Record<string, unknown>) {
  const { search, limit } = args as { search?: string; limit?: number };

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();

  const result = await apiRequest<TemplateListResult>(
    `/templates${qs ? "?" + qs : ""}`
  );

  if (result.templates.length === 0) {
    return textResult("No templates found.");
  }

  let text = `Found ${result.total} template(s):\n\n`;
  for (const t of result.templates) {
    text += `- ${t.title} (ID: ${t.id})\n`;
    text += `  Pages: ${t.page_count}, Used: ${t.use_count} times\n`;
    if (t.description) text += `  Description: ${t.description}\n`;
  }

  return textResult(text);
}

async function handleCreateFromTemplate(args: Record<string, unknown>) {
  const { template_id, recipients, prefill_fields, title, send_immediately } =
    args as {
      template_id: string;
      recipients: Array<{ email: string; name?: string }>;
      prefill_fields?: Record<string, string>;
      title?: string;
      send_immediately?: boolean;
    };

  const body: Record<string, unknown> = {
    recipients: recipients.map((r) => ({ email: r.email, name: r.name || "" })),
    send_immediately: send_immediately || false,
  };
  if (prefill_fields) body.prefill_fields = prefill_fields;
  if (title) body.title = title;

  const result = await apiRequest<EnvelopeResult>(
    `/templates/${template_id}/use`,
    { method: "POST", body }
  );

  let text = `Envelope created from template!\n\n`;
  text += `- Envelope ID: ${result.id}\n`;
  text += `- Title: ${result.title}\n`;
  text += `- Status: ${result.status}\n`;
  text += `\nRecipients:\n`;
  for (const r of result.recipients) {
    text += `  - ${r.name} (${r.email}): ${r.status}\n`;
  }

  return textResult(text);
}

// ── Helpers ──

function textResult(text: string) {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string) {
  return { content: [{ type: "text", text }], isError: true };
}
