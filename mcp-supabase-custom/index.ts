import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pkg;
const DB_URL = process.env.SUPABASE_DB_URL;
const ALLOW_MUTATING_SQL = process.env.ALLOW_MUTATING_SQL === "true";
const SSL_REJECT_UNAUTHORIZED = process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED !== "false";

if (!DB_URL) {
  console.error(
    "[MCP] Falta SUPABASE_DB_URL. Copia mcp-supabase-custom/.env.example a .env y define la URL de Postgres."
  );
  process.exit(1);
}

const server = new Server(
  { name: "supabase-direct", version: "1.1.0" },
  { capabilities: { tools: {} } }
);

const isReadOnlySql = (sql: string) => {
  const normalized = sql.trim().replace(/;+\s*$/, "");
  const startsReadOnly = /^(select|with|explain)\b/i.test(normalized);
  const mutatingKeyword = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|merge|call|copy|vacuum|reindex|refresh|comment)\b/i.test(normalized);
  return startsReadOnly && !mutatingKeyword;
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "ejecutar_sql",
    description: "Ejecuta SQL en Supabase. Por defecto solo permite SELECT/WITH/EXPLAIN; define ALLOW_MUTATING_SQL=true para mutaciones locales deliberadas.",
    inputSchema: {
      type: "object",
      properties: { sql: { type: "string" } },
      required: ["sql"]
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "ejecutar_sql") throw new Error("Tool not found");

  const sql = request.params.arguments?.sql;
  if (typeof sql !== "string" || !sql.trim()) {
    return { isError: true, content: [{ type: "text", text: "SQL requerido." }] };
  }

  if (!ALLOW_MUTATING_SQL && !isReadOnlySql(sql)) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: "Bloqueado: esta herramienta esta en modo lectura. Define ALLOW_MUTATING_SQL=true solo para una intervencion local controlada."
      }]
    };
  }

  const pgClient = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: SSL_REJECT_UNAUTHORIZED },
    statement_timeout: 15000,
    query_timeout: 20000
  });

  try {
    await pgClient.connect();
    const res = await pgClient.query(sql);
    const payload = res.rows?.length ? JSON.stringify(res.rows, null, 2) : `Exito: ${res.rowCount ?? 0} filas afectadas.`;
    return { content: [{ type: "text", text: payload }] };
  } catch (err: any) {
    return { isError: true, content: [{ type: "text", text: `Error de DB: ${err.message}` }] };
  } finally {
    await pgClient.end().catch(() => {});
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
