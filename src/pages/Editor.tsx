import { useState } from "react";
import { Link } from "react-router-dom";
import MonacoEditor from "@monaco-editor/react";
import { Play, Save, GitCommit, Plus, X, ChevronLeft, FolderGit2, FileCode2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface FileTab {
  name: string;
  language: string;
  content: string;
}

const defaultFiles: FileTab[] = [
  {
    name: "Main.java",
    language: "java",
    content: `package com.project;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from CollabSpace!");
        
        Calculator calc = new Calculator();
        System.out.println("2 + 3 = " + calc.add(2, 3));
    }
}`,
  },
  {
    name: "Calculator.java",
    language: "java",
    content: `package com.project;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public int subtract(int a, int b) {
        return a - b;
    }
}`,
  },
  {
    name: "main.py",
    language: "python",
    content: `from utils import greet

def main():
    print("Hello from CollabSpace!")
    greet("World")

if __name__ == "__main__":
    main()`,
  },
];

const Editor = () => {
  const [files] = useState<FileTab[]>(defaultFiles);
  const [activeTab, setActiveTab] = useState(0);
  const [output, setOutput] = useState<string>("");
  const [showOutput, setShowOutput] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const handleRun = () => {
    setIsRunning(true);
    setShowOutput(true);
    setOutput("⏳ Compiling...\n");

    setTimeout(() => {
      if (files[activeTab].language === "java") {
        setOutput(
          `$ javac -d out $(find src -name "*.java")\n$ java -cp out com.project.Main\n\nHello from CollabSpace!\n2 + 3 = 5\n\n✅ Process exited with code 0 (0.34s)`
        );
      } else {
        setOutput(
          `$ python3 main.py\n\nHello from CollabSpace!\nHello, World!\n\n✅ Process exited with code 0 (0.12s)`
        );
      }
      setIsRunning(false);
    }, 1200);
  };

  const activeFile = files[activeTab];

  return (
    <div className="h-screen flex flex-col bg-background dark">
      {/* Toolbar */}
      <div className="h-12 flex items-center justify-between border-b border-border px-3 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ChevronLeft className="h-3 w-3" /> Back
            </Button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <FolderGit2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono font-medium text-foreground">sorting-algorithms</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Save className="h-3 w-3" /> Save
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <GitCommit className="h-3 w-3" /> Commit
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleRun}
            disabled={isRunning}
          >
            <Play className="h-3 w-3" /> {isRunning ? "Running..." : "Run"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-border bg-card/50 overflow-hidden"
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs text-muted-foreground px-2 py-1 font-mono">src/com/project/</div>
                  {files.map((f, i) => (
                    <button
                      key={f.name}
                      onClick={() => setActiveTab(i)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                        i === activeTab
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      <FileCode2 className="h-3 w-3" />
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex items-center bg-card/30 border-b border-border">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors border-r border-border"
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${showSidebar ? "rotate-180" : ""}`} />
            </button>
            {files.map((f, i) => (
              <button
                key={f.name}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-4 py-2 text-xs border-r border-border transition-colors ${
                  i === activeTab
                    ? "bg-background text-foreground border-b-2 border-b-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
              >
                <FileCode2 className="h-3 w-3" />
                {f.name}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1">
            <MonacoEditor
              height="100%"
              language={activeFile.language}
              value={activeFile.content}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                padding: { top: 16 },
                lineNumbers: "on",
                renderWhitespace: "selection",
                smoothScrolling: true,
                cursorBlinking: "smooth",
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Output Panel */}
          <AnimatePresence>
            {showOutput && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 200 }}
                exit={{ height: 0 }}
                className="border-t border-border bg-card/80 overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Output</span>
                  <button onClick={() => setShowOutput(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono text-foreground overflow-auto h-[calc(100%-36px)] whitespace-pre-wrap">
                  {output}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Editor;
