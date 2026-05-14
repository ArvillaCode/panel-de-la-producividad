import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pkg from 'pg';
const { Client } = pkg;

// URL Directa para evitar errores de codificación en archivos .env
const DB_URL = "postgresql://postgres:DF61HdWAVEzuqgUM@db.krtthtzljlyewlngaklo.supabase.co:5432/postgres";

const server = new Server(
    { name: "supabase-direct", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
        name: "ejecutar_sql",
        description: "Ejecuta comandos SQL directamente en Supabase.",
        inputSchema: {
            type: "object",
            properties: { sql: { type: "string" } },
            required: ["sql"]
        }
    }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "ejecutar_sql") throw new Error("Tool not found");
    const sql = request.params.arguments?.sql as string;

    const pgClient = new Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pgClient.connect();
        const res = await pgClient.query(sql);
        await pgClient.end();
        return { content: [{ type: "text", text: `Exito: ${res.rowCount} filas afectadas.` }] };
    } catch (err: any) {
        if (pgClient) await pgClient.end().catch(() => { });
        return { isError: true, content: [{ type: "text", text: `Error de DB: ${err.message}` }] };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);