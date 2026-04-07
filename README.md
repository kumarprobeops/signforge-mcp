# @signforge/mcp-server

Send documents for e-signature directly from Claude Desktop, Claude Code, Cursor, and other AI agents — powered by [SignForge](https://signforge.io), the free e-signature platform.

## What It Does

This MCP server connects AI agents to SignForge's e-signature API. Your AI assistant can:

- **Send documents for signature** — upload a PDF, specify a signer, and send in one step
- **Manage envelopes** — send, void, delete, and check status
- **Download documents** — signed PDFs, audit certificates, and ZIP archives
- **Use templates** — create envelopes from reusable templates with pre-filled fields
- **Manage webhooks** — subscribe to real-time envelope events
- **Generate embed URLs** — create embeddable signing experiences

## Quick Start

### 1. Get Your API Key

Sign up at [signforge.io](https://signforge.io) and generate an API key from your [Developer Settings](https://signforge.io/dashboard/developers).

### 2. Configure Your AI Client

Choose your client below and add the configuration:

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "signforge": {
      "command": "npx",
      "args": ["-y", "@signforge/mcp-server"],
      "env": {
        "SIGNFORGE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

#### Claude Code

```bash
claude mcp add signforge -- npx -y @signforge/mcp-server
```

Then set the environment variable in your shell:
```bash
export SIGNFORGE_API_KEY="your-api-key-here"
```

#### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "signforge": {
      "command": "npx",
      "args": ["-y", "@signforge/mcp-server"],
      "env": {
        "SIGNFORGE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Direct (npx)

```bash
SIGNFORGE_API_KEY="your-api-key-here" npx -y @signforge/mcp-server
```

### 3. Restart Your Client

Restart Claude Desktop, Claude Code, or Cursor to pick up the new MCP server.

## Tools

### Envelope Management

| Tool | Description |
|------|-------------|
| `create_and_send` | Upload a PDF, add a signer, and send for e-signature. Accepts a local file path or base64-encoded PDF. |
| `check_status` | Check the status of an envelope — see signing progress, timestamps, and available documents. |
| `list_envelopes` | List your envelopes with optional status filtering (`draft`, `sent`, `completed`, `voided`, `expired`). |
| `send_envelope` | Send a draft envelope for signing. |
| `void_envelope` | Void (cancel) an active envelope with an optional reason. |
| `delete_envelope` | Permanently delete a draft or voided envelope. |

### Document Downloads

| Tool | Description |
|------|-------------|
| `download_signed` | Download the signed PDF for a completed envelope to a local file. |
| `download_certificate` | Download the audit certificate PDF with full audit trail. |
| `download_archive` | Download a ZIP archive with signed PDF, certificate, and all documents. |

### Embedded Signing

| Tool | Description |
|------|-------------|
| `get_embed_url` | Generate an embeddable signing URL for in-app signing experiences. |

### Templates

| Tool | Description |
|------|-------------|
| `list_templates` | List your reusable document templates. |
| `create_from_template` | Create an envelope from a template with optional pre-filled field values. Send immediately or save as draft. |

### Webhooks

| Tool | Description |
|------|-------------|
| `create_webhook` | Subscribe to envelope events (sent, viewed, signed, completed, expired, voided, declined). |
| `list_webhooks` | List all configured webhooks. |
| `delete_webhook` | Delete a webhook by ID. |

## Example Conversations

### Send a document for signature

```
You: Send my NDA at ~/Documents/nda.pdf to jane@example.com (Jane Smith) for signature.

AI: I'll send that NDA for signature now.

[Uses create_and_send tool]

Done! I've created and sent the envelope:
- Envelope ID: a1b2c3d4-...
- Status: sent
- Jane Smith (jane@example.com) will receive a signing link via email.
```

### Check status and download

```
You: Has Jane signed the NDA yet?

AI: Let me check.

[Uses check_status tool]

Yes! Jane signed it on April 7 at 2:15 PM. The envelope is now completed.

You: Great, download the signed copy and the audit certificate.

[Uses download_signed tool]
[Uses download_certificate tool]

Done! Files saved:
- Signed PDF: ~/Documents/nda-signed.pdf
- Audit Certificate: ~/Documents/nda-certificate.pdf
```

### Use a template with pre-filled fields

```
You: Send our standard consulting agreement to bob@acme.com.
     Pre-fill the company name as "Acme Corp" and the start date as "May 1, 2026".

AI: I'll create that from your consulting agreement template.

[Uses list_templates tool — finds "Consulting Agreement" template]
[Uses create_from_template tool — with prefill_fields and send_immediately: true]

Done! Envelope created and sent:
- Title: Consulting Agreement
- Recipient: bob@acme.com
- Pre-filled: company = "Acme Corp", start_date = "May 1, 2026"
- Status: sent
```

### Manage envelope lifecycle

```
You: List my sent envelopes.

[Uses list_envelopes tool with status: "sent"]

You: Void the contract for Project Alpha — the deal fell through.

[Uses void_envelope tool with reason]

You: Now delete it.

[Uses delete_envelope tool]

Done — envelope voided and deleted.
```

### Set up a webhook

```
You: Set up a webhook to notify my server when documents are signed or completed.

[Uses create_webhook tool]

Webhook created:
- URL: https://api.yourapp.com/webhooks/signforge
- Events: envelope.signed, envelope.completed
- Secret: whsec_abc123... (save this for signature verification!)
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SIGNFORGE_API_KEY` | Yes | — | Your SignForge API key. Get one at [signforge.io/dashboard/developers](https://signforge.io/dashboard/developers). |
| `SIGNFORGE_API_URL` | No | `https://signforge.io/api/v1` | API base URL. Only change this for self-hosted instances or staging. |

## Sandbox Mode

API keys created in sandbox mode will create test envelopes that don't send real emails. Use sandbox mode during development and testing.

## Troubleshooting

**"SIGNFORGE_API_KEY environment variable is required"**
Make sure you've set the `SIGNFORGE_API_KEY` in your MCP client configuration. See the setup instructions above.

**"SignForge API error (401)"**
Your API key is invalid or expired. Generate a new one at [signforge.io/dashboard/developers](https://signforge.io/dashboard/developers).

**"SignForge API error (403)"**
Your API key doesn't have permission for this operation. Check your key's scopes.

**"SignForge API error (429)"**
You've hit the rate limit. Wait a moment and try again.

**Server not showing up in Claude Desktop**
1. Make sure the config JSON is valid (no trailing commas)
2. Restart Claude Desktop completely (quit + reopen)
3. Check the MCP server logs in Claude Desktop's developer console

## Links

- [SignForge](https://signforge.io) — Free e-signature platform
- [API Documentation](https://signforge.io/developers) — Full API reference
- [GitHub](https://github.com/kumarprobeops/signforge-mcp) — Source code
- [MCP Protocol](https://modelcontextprotocol.io) — Model Context Protocol specification

## License

MIT
