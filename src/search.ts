import { promises as fs } from 'fs';
import { join, relative, extname, basename, dirname } from 'path';
import { glob } from 'fast-glob';
import {
  FileMatch,
  MatchReason,
  FileMetadata,
  SearchOptions,
  SearchResult,
  ParsedQuery,
  DEFAULT_WEIGHTS,
  DEFAULT_EXCLUDE_PATTERNS,
  LANGUAGE_EXTENSIONS,
  TEST_PATTERNS,
  CONFIG_PATTERNS,
  DOC_PATTERNS,
} from './types.js';

export function parseQuery(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  const terms: string[] = [];
  const exactTerms: string[] = [];
  const fileTypes: string[] = [];

  const quotedMatches = query.match(/"([^"]+)"/g) || [];
  for (const match of quotedMatches) {
    exactTerms.push(match.replace(/"/g, '').toLowerCase());
  }

  const cleanQuery = query.replace(/"[^"]+"/g, ' ');
  const words = cleanQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0);

  const typeIndicators = ['file', 'files', 'type', 'extension', 'ext'];
  const testIndicators = ['test', 'tests', 'spec', 'specs', 'testing'];
  const configIndicators = ['config', 'configuration', 'settings', 'setting'];
  const docIndicators = ['doc', 'docs', 'documentation', 'readme'];

  for (const word of words) {
    if (word.startsWith('.')) {
      fileTypes.push(word);
    } else if (!typeIndicators.includes(word)) {
      terms.push(word);
    }
  }

  for (const word of words) {
    if (word.startsWith('.')) {
      fileTypes.push(word);
    }
  }

  for (const [lang, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (lowerQuery.includes(lang)) {
      fileTypes.push(...extensions);
    }
  }

  return {
    original: query,
    terms: [...new Set(terms)],
    exactTerms: [...new Set(exactTerms)],
    fileTypes: [...new Set(fileTypes)],
    wantTests: testIndicators.some(t => lowerQuery.includes(t)),
    wantConfigs: configIndicators.some(c => lowerQuery.includes(c)),
    wantDocs: docIndicators.some(d => lowerQuery.includes(d)),
  };
}

export function isTestFile(filePath: string): boolean {
  const name = basename(filePath).toLowerCase();
  return TEST_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(name) || regex.test(filePath.toLowerCase());
  });
}

export function isConfigFile(filePath: string): boolean {
  const name = basename(filePath).toLowerCase();
  return CONFIG_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(name) || regex.test(filePath.toLowerCase());
  });
}

export function isDocFile(filePath: string): boolean {
  const name = basename(filePath).toLowerCase();
  return DOC_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(name) || regex.test(filePath.toLowerCase());
  });
}

export function detectLanguage(filePath: string): string | undefined {
  const ext = extname(filePath).toLowerCase();
  for (const [lang, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return lang;
    }
  }
  return undefined;
}

export async function extractMetadata(filePath: string): Promise<FileMetadata> {
  const stats = await fs.stat(filePath);
  const content = await fs.readFile(filePath, 'utf-8').catch(() => '');
  const lines = content.split('\n');

  return {
    size: stats.size,
    lastModified: stats.mtime,
    extension: extname(filePath),
    lineCount: lines.length,
    isTest: isTestFile(filePath),
    isConfig: isConfigFile(filePath),
    isDoc: isDocFile(filePath),
    language: detectLanguage(filePath),
    exports: extractExports(content),
    imports: extractImports(content),
  };
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  const patterns = [
    /export\s+(?:default\s+)?(?:class|interface|type|function|const|let|var)\s+(\w+)/g,
    /export\s*\{\s*([^}]+)\s*\}/g,
    /module\.exports\s*=\s*\{?\s*(\w+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
        exports.push(...names.filter(n => n && !n.startsWith('_')));
      }
    }
  }

  return [...new Set(exports)];
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const patterns = [
    /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        imports.push(match[1]);
      }
    }
  }

  return [...new Set(imports)];
}

function calculateFilenameScore(filePath: string, query: ParsedQuery): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let totalScore = 0;
  const filename = basename(filePath).toLowerCase();
  const filenameNoExt = basename(filePath, extname(filePath)).toLowerCase();

  for (const term of query.terms) {
    if (filename === term) {
      totalScore += DEFAULT_WEIGHTS.filename;
      reasons.push({
        type: 'filename',
        description: `Exact filename match: "${term}"`,
        contribution: DEFAULT_WEIGHTS.filename,
      });
    } else if (filenameNoExt === term) {
      totalScore += DEFAULT_WEIGHTS.filename * 0.9;
      reasons.push({
        type: 'filename',
        description: `Exact name match (no extension): "${term}"`,
        contribution: DEFAULT_WEIGHTS.filename * 0.9,
      });
    } else if (filename.includes(term)) {
      totalScore += DEFAULT_WEIGHTS.filename * 0.6;
      reasons.push({
        type: 'filename',
        description: `Partial filename match: "${term}"`,
        contribution: DEFAULT_WEIGHTS.filename * 0.6,
      });
    }
  }

  for (const exact of query.exactTerms) {
    if (filename.includes(exact.toLowerCase())) {
      totalScore += DEFAULT_WEIGHTS.filename * 1.2;
      reasons.push({
        type: 'filename',
        description: `Exact phrase match: "${exact}"`,
        contribution: DEFAULT_WEIGHTS.filename * 1.2,
      });
    }
  }

  return { score: totalScore, reasons };
}

function calculateFilepathScore(filePath: string, query: ParsedQuery): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let totalScore = 0;
  const normalizedPath = filePath.toLowerCase();
  const dirPath = dirname(normalizedPath);

  for (const term of query.terms) {
    if (dirPath.includes(term)) {
      totalScore += DEFAULT_WEIGHTS.filepath * 0.5;
      reasons.push({
        type: 'filepath',
        description: `Directory path match: "${term}"`,
        contribution: DEFAULT_WEIGHTS.filepath * 0.5,
      });
    }
  }

  const pathTerms = dirPath.split(/[/\\]/);
  for (const term of query.terms) {
    if (pathTerms.some(pt => pt === term)) {
      totalScore += DEFAULT_WEIGHTS.filepath * 0.8;
      reasons.push({
        type: 'filepath',
        description: `Exact directory match: "${term}"`,
        contribution: DEFAULT_WEIGHTS.filepath * 0.8,
      });
    }
  }

  return { score: totalScore, reasons };
}

async function calculateContentScore(
  filePath: string,
  query: ParsedQuery,
  content?: string
): Promise<{ score: number; reasons: MatchReason[] }> {
  const reasons: MatchReason[] = [];
  let totalScore = 0;

  const fileContent = content ?? await fs.readFile(filePath, 'utf-8').catch(() => '');
  const normalizedContent = fileContent.toLowerCase();
  const lines = fileContent.split('\n');

  for (const term of query.terms) {
    const occurrences = (normalizedContent.match(new RegExp(term, 'g')) || []).length;
    if (occurrences > 0) {
      const contribution = Math.min(DEFAULT_WEIGHTS.content, DEFAULT_WEIGHTS.content * (occurrences / 5));
      totalScore += contribution;
      reasons.push({
        type: 'content',
        description: `Content contains "${term}" (${occurrences} occurrences)`,
        contribution,
      });
    }
  }

  for (const exact of query.exactTerms) {
    if (normalizedContent.includes(exact.toLowerCase())) {
      totalScore += DEFAULT_WEIGHTS.content * 1.5;
      reasons.push({
        type: 'content',
        description: `Exact phrase in content: "${exact}"`,
        contribution: DEFAULT_WEIGHTS.content * 1.5,
      });
    }
  }

  for (const term of query.terms) {
    const funcRegex = new RegExp(`(?:function|def|fn|func)\s+${term}\\s*\\(`, 'i');
    if (funcRegex.test(fileContent)) {
      totalScore += DEFAULT_WEIGHTS.function;
      reasons.push({
        type: 'function',
        description: `Function named "${term}"`,
        contribution: DEFAULT_WEIGHTS.function,
      });
    }

    const classRegex = new RegExp(`(?:class|interface|struct|enum)\s+${term}\\b`, 'i');
    if (classRegex.test(fileContent)) {
      totalScore += DEFAULT_WEIGHTS.class;
      reasons.push({
        type: 'class',
        description: `Class/Type named "${term}"`,
        contribution: DEFAULT_WEIGHTS.class,
      });
    }

    const commentRegex = new RegExp(`(?:\\/\\/|#|\\*|\\/\\*)[^\\n]*${term}`, 'i');
    if (commentRegex.test(fileContent)) {
      totalScore += DEFAULT_WEIGHTS.comment * 0.5;
      reasons.push({
        type: 'comment',
        description: `Mentioned in comments: "${term}"`,
        contribution: DEFAULT_WEIGHTS.comment * 0.5,
      });
    }
  }

  return { score: totalScore, reasons };
}

function calculateMetadataScore(metadata: FileMetadata, query: ParsedQuery): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let totalScore = 0;

  if (query.fileTypes.length > 0) {
    const hasMatchingType = query.fileTypes.some(ext =>
      metadata.extension.toLowerCase() === ext.toLowerCase()
    );
    if (hasMatchingType) {
      totalScore += 10;
      reasons.push({
        type: 'content',
        description: `Matching file type: ${metadata.extension}`,
        contribution: 10,
      });
    }
  }

  if (metadata.isTest && query.wantTests) {
    totalScore += DEFAULT_WEIGHTS.test;
    reasons.push({
      type: 'test',
      description: 'Test file (matches query intent)',
      contribution: DEFAULT_WEIGHTS.test,
    });
  }

  if (metadata.isConfig && query.wantConfigs) {
    totalScore += DEFAULT_WEIGHTS.config;
    reasons.push({
      type: 'config',
      description: 'Configuration file (matches query intent)',
      contribution: DEFAULT_WEIGHTS.config,
    });
  }

  if (metadata.isDoc && query.wantDocs) {
    totalScore += 8;
    reasons.push({
      type: 'content',
      description: 'Documentation file (matches query intent)',
      contribution: 8,
    });
  }

  if (metadata.exports && metadata.exports.length > 0) {
    for (const term of query.terms) {
      const matchingExports = metadata.exports.filter(e =>
        e.toLowerCase().includes(term)
      );
      if (matchingExports.length > 0) {
        totalScore += DEFAULT_WEIGHTS.export;
        reasons.push({
          type: 'export',
          description: `Exports: ${matchingExports.slice(0, 2).join(', ')}`,
          contribution: DEFAULT_WEIGHTS.export,
        });
        break;
      }
    }
  }

  return { score: totalScore, reasons };
}

export async function calculateFileScore(
  filePath: string,
  query: ParsedQuery,
  metadata: FileMetadata,
  rootPath: string,
  searchContent: boolean
): Promise<FileMatch> {
  const relativePath = relative(rootPath, filePath);

  const filenameResult = calculateFilenameScore(filePath, query);
  const filepathResult = calculateFilepathScore(filePath, query);
  const metadataResult = calculateMetadataScore(metadata, query);

  let contentResult = { score: 0, reasons: [] as MatchReason[] };
  if (searchContent && metadata.size < 1024 * 1024) {
    contentResult = await calculateContentScore(filePath, query);
  }

  const totalScore = Math.min(100,
    filenameResult.score +
    filepathResult.score +
    metadataResult.score +
    contentResult.score
  );

  const allReasons = [
    ...filenameResult.reasons,
    ...filepathResult.reasons,
    ...metadataResult.reasons,
    ...contentResult.reasons,
  ];

  allReasons.sort((a, b) => b.contribution - a.contribution);

  return {
    path: filePath,
    relativePath,
    score: Math.round(totalScore),
    reasons: allReasons.slice(0, 5),
    metadata,
  };
}

export async function searchFiles(options: SearchOptions): Promise<SearchResult> {
  const startTime = Date.now();
  const rootPath = options.rootPath || process.cwd();
  const parsedQuery = parseQuery(options.query);
  const maxFiles = options.maxFiles || 10;
  const minScore = options.minScore || 15;
  const searchContent = options.searchContent ?? true;
  const maxFileSize = options.maxFileSize || 1024 * 1024;

  const excludePatterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...(options.exclude || []),
  ];

  if (!options.includeTests) {
    excludePatterns.push(...TEST_PATTERNS);
  }
  if (!options.includeConfigs) {
    excludePatterns.push(...CONFIG_PATTERNS);
  }
  if (!options.includeDocs) {
    excludePatterns.push(...DOC_PATTERNS);
  }

  const includePatterns = options.include || ['**/*'];

  const files = await glob(includePatterns, {
    cwd: rootPath,
    absolute: true,
    ignore: excludePatterns,
    onlyFiles: true,
  });

  const matches: FileMatch[] = [];

  for (const filePath of files) {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > maxFileSize) continue;

      const metadata = await extractMetadata(filePath);
      const match = await calculateFileScore(
        filePath,
        parsedQuery,
        metadata,
        rootPath,
        searchContent
      );

      if (match.score >= minScore) {
        matches.push(match);
      }
    } catch {
      continue;
    }
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    files: matches.slice(0, maxFiles),
    filesScanned: files.length,
    timeMs: Date.now() - startTime,
    query: options.query,
  };
}
