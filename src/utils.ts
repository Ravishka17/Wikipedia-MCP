// Shared helper used by both the MCP route handler and the SDK tool registrations.
export const formatToolResult = (result: any) => ({
  content: result.content.map((item: any) => ({
    type: item.type as 'text',
    text: item.text
  })),
  isError: result.isError ? true : undefined
});
