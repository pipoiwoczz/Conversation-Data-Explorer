import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AskPanel } from "@/components/panel/askPanel";
import { SQLPanel } from "./components/panel/sqlPanel";
import { Navbar, Footer } from "./components/navbar/navbar";

// const API_BASE = "https://conversation-data-explorer.onrender.com" || ""; // e.g. "https://your.render.app"

const DB_OPTIONS = [
  { label: "Chinook (SQLite)", value: "chinook" },
  { label: "Marketing Demo", value: "marketing" },
  { label: "Ecommerce Demo", value: "ecommerce" },
  { label: "HR Demo", value: "hr" },
];



export default function App() {
  // Global selections live here so all tabs share them
  const [db, setDb] = useState<string>(DB_OPTIONS[0].value);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <Navbar db={db} onChangeDb={setDb} />
      <main className="max-w-6xl mx-auto p-4 md:p-8 grid gap-6">
        <Tabs defaultValue="sql" className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sql" className="text-sm">SQL (Schema & Safe Exec)</TabsTrigger>
            <TabsTrigger value="ask" className="text-sm">Ask (RAG / Docs)</TabsTrigger>
          </TabsList>

          <TabsContent value="sql">
            <SQLPanel db={db} />
          </TabsContent>

          <TabsContent value="ask">
            <AskPanel db={db} />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}



