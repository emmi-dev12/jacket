import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { chat } from './adapters/index.js';
import { addEntry, getHistory } from './history.js';

const Y = '#F5C400';
const DIM = '#444444';
const WHITE = '#F0EDE8';

const INTERPRETER_SYSTEM = `You are Jacket's interpreter. Take the user's rough description of a 3D object and produce a precise specification through a short focused conversation.

Ask ONLY what you genuinely need — no more than 3-4 questions total.
When confident, output EXACTLY this JSON and nothing else:

{"spec":{"name":"...","description":"...","dimensions":"...","features":"...","material_hint":"pla|petg|resin|unknown","shape_hint":"box|cylinder|sphere|complex"}}

Do not output the JSON until genuinely confident.`;

function parseSpec(text) {
  try { const p = JSON.parse(text); if (p.spec) return p.spec; } catch {}
  const m = text.match(/\{[\s\S]*"spec"[\s\S]*\}/);
  if (m) { try { const p = JSON.parse(m[0]); if (p.spec) return p.spec; } catch {} }
  return null;
}

function Logo() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={Y}>JACKET</Text>
      <Text color={DIM}>spatial intelligence layer</Text>
    </Box>
  );
}

function Divider({ width = 40, color = DIM }) {
  return <Text color={color}>{'─'.repeat(width)}</Text>;
}

function HistoryPanel({ items, selectedIndex, focused }) {
  return (
    <Box flexDirection="column" width={28} borderStyle="single" borderColor={focused ? Y : DIM} paddingX={1}>
      <Text color={Y} bold>HISTORY</Text>
      <Divider width={24} />
      {items.length === 0 && <Text color={DIM}>no objects yet</Text>}
      {items.slice(0, 12).map((item, i) => (
        <Box key={item.id}>
          <Text color={i === selectedIndex ? Y : WHITE} inverse={i === selectedIndex}>
            {i === selectedIndex ? '› ' : '  '}
            {(item.spec?.name || item.prompt || 'untitled').slice(0, 18)}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

function ChatPanel({ messages, input, onInputChange, focused, status }) {
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor={focused ? Y : DIM} paddingX={1}>
      <Box justifyContent="space-between">
        <Text color={Y} bold>SESSION</Text>
        <Text color={DIM}>{status}</Text>
      </Box>
      <Divider width={50} />
      <Box flexDirection="column" flexGrow={1}>
        {messages.slice(-10).map((m, i) => (
          <Box key={i} marginBottom={0}>
            <Text color={m.role === 'jacket' ? Y : DIM}>
              {m.role === 'jacket' ? 'JACKET › ' : 'YOU    › '}
            </Text>
            <Text color={m.role === 'jacket' ? WHITE : DIM} wrap="wrap">
              {m.text}
            </Text>
          </Box>
        ))}
      </Box>
      <Divider width={50} />
      <Box>
        <Text color={Y}>› </Text>
        <Text color={WHITE}>{input}<Text color={Y}>█</Text></Text>
      </Box>
    </Box>
  );
}

function SpecBar({ spec }) {
  if (!spec) return (
    <Box borderStyle="single" borderColor={DIM} paddingX={1}>
      <Text color={DIM}>no spec yet — describe an object above</Text>
    </Box>
  );
  return (
    <Box borderStyle="single" borderColor={Y} paddingX={1} gap={3}>
      <Text color={DIM}>OBJECT <Text color={Y}>{spec.name}</Text></Text>
      <Text color={DIM}>SIZE <Text color={Y}>{spec.dimensions}</Text></Text>
      <Text color={DIM}>MATERIAL <Text color={Y}>{spec.material_hint}</Text></Text>
    </Box>
  );
}

function App({ provider }) {
  const { exit } = useApp();
  const [history, setHistory] = useState(getHistory());
  const [messages, setMessages] = useState([
    { role: 'jacket', text: 'Ready. Describe what you want to print.' }
  ]);
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [spec, setSpec] = useState(null);
  const [status, setStatus] = useState('idle');
  const [focus, setFocus] = useState('chat'); // 'chat' | 'history'
  const [historyIndex, setHistoryIndex] = useState(0);

  const addMsg = (role, text) => setMessages(prev => [...prev, { role, text }]);

  const callAI = useCallback(async (msgs) => {
    setStatus('thinking...');
    try {
      const reply = await chat({ provider, system: INTERPRETER_SYSTEM, messages: msgs });
      const parsed = parseSpec(reply);
      if (parsed) {
        setSpec(parsed);
        addMsg('jacket', `Got it: ${parsed.name}. Spec locked.`);
        addEntry({ prompt: msgs[0].content, spec: parsed, openscad: null });
        setHistory(getHistory());
        setStatus('spec ready — open --webui to generate STL');
      } else {
        addMsg('jacket', reply);
        setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
        setStatus('waiting for your reply');
      }
    } catch (e) {
      addMsg('jacket', `Error: ${e.message}`);
      setStatus('error');
    }
  }, [provider]);

  useInput((ch, key) => {
    if (key.ctrl && ch === 'c') { exit(); return; }

    // Tab switches focus
    if (key.tab) {
      setFocus(f => f === 'chat' ? 'history' : 'chat');
      return;
    }

    if (focus === 'history') {
      if (key.upArrow) setHistoryIndex(i => Math.max(0, i - 1));
      if (key.downArrow) setHistoryIndex(i => Math.min(history.length - 1, i + 1));
      return;
    }

    // Chat focus
    if (key.return) {
      if (!input.trim()) return;
      const text = input.trim();
      setInput('');
      addMsg('user', text);
      const newHistory = [...chatHistory, { role: 'user', content: text }];
      setChatHistory(newHistory);
      callAI(newHistory);
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    if (ch && !key.ctrl && !key.meta) {
      setInput(prev => prev + ch);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Logo />
      <Box flexDirection="row" gap={1} flexGrow={1}>
        <HistoryPanel items={history} selectedIndex={historyIndex} focused={focus === 'history'} />
        <ChatPanel
          messages={messages}
          input={input}
          focused={focus === 'chat'}
          status={status}
        />
      </Box>
      <SpecBar spec={spec} />
      <Box marginTop={1}>
        <Text color={DIM}>tab: switch panel  ·  ctrl+c: quit  ·  jacket --webui: open studio</Text>
      </Box>
    </Box>
  );
}

export function startTUI(provider = 'claude') {
  render(<App provider={provider} />);
}
