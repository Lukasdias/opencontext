export interface FileMatch {
  path: string;
  relativePath: string;
  score: number;
  reasons: MatchReason[];
  metadata: FileMetadata;
}

export interface MatchReason {
  type: MatchType;
  description: string;
  matchedContent?: string;
  contribution: number;
}

export type MatchType =
  | 'filename'
  | 'filepath'
  | 'content'
  | 'export'
  | 'import'
  | 'function'
  | 'class'
  | 'interface'
  | 'comment'
  | 'config'
  | 'test'
  | 'related';

export interface FileMetadata {
  size: number;
  lastModified: Date;
  extension: string;
  lineCount: number;
  isTest: boolean;
  isConfig: boolean;
  isDoc: boolean;
  language?: string;
  exports?: string[];
  imports?: string[];
}

export interface SearchOptions {
  query: string;
  maxFiles?: number;
  minScore?: number;
  rootPath?: string;
  include?: string[];
  exclude?: string[];
  includeTests?: boolean;
  includeConfigs?: boolean;
  includeDocs?: boolean;
  searchContent?: boolean;
  maxFileSize?: number;
}

export interface SearchResult {
  files: FileMatch[];
  filesScanned: number;
  timeMs: number;
  query: string;
}

export interface ParsedQuery {
  original: string;
  terms: string[];
  exactTerms: string[];
  fileTypes: string[];
  wantTests: boolean;
  wantConfigs: boolean;
  wantDocs: boolean;
}

export interface ScoringWeights {
  filename: number;
  filepath: number;
  content: number;
  export: number;
  import: number;
  function: number;
  class: number;
  interface: number;
  comment: number;
  config: number;
  test: number;
  related: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  filename: 25,
  filepath: 20,
  content: 15,
  export: 20,
  import: 10,
  function: 15,
  class: 15,
  interface: 12,
  comment: 5,
  config: 18,
  test: 12,
  related: 8,
};

export const LANGUAGE_EXTENSIONS: Record<string, string[]> = {
  typescript: ['.ts', '.tsx', '.mts', '.cts'],
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  python: ['.py', '.pyi', '.pyw'],
  rust: ['.rs'],
  go: ['.go'],
  java: ['.java'],
  csharp: ['.cs'],
  ruby: ['.rb'],
  php: ['.php'],
  swift: ['.swift'],
  kotlin: ['.kt', '.kts'],
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
  shell: ['.sh', '.bash', '.zsh', '.fish'],
  markdown: ['.md', '.mdx'],
  json: ['.json'],
  yaml: ['.yaml', '.yml'],
  html: ['.html', '.htm'],
  css: ['.css', '.scss', '.sass', '.less'],
  sql: ['.sql'],
  docker: ['.dockerfile', 'Dockerfile'],
  config: ['.toml', '.ini', '.conf', '.cfg'],
};

export const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
  '**/*.lock',
];

export const TEST_PATTERNS = [
  '*.test.*',
  '*.spec.*',
  '*_test.*',
  '*_spec.*',
  'test_*',
  'tests/**',
  '__tests__/**',
  'spec/**',
  'e2e/**',
  'integration/**',
];

export const CONFIG_PATTERNS = [
  '*.config.*',
  '.config/**',
  'config/**',
  'configs/**',
  '.*rc*',
  '.*rc',
];

export const DOC_PATTERNS = [
  '*.md',
  '*.mdx',
  'README*',
  'CHANGELOG*',
  'CONTRIBUTING*',
  'LICENSE*',
  'docs/**',
  'doc/**',
  'documentation/**',
];
