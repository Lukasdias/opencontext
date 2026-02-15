import { describe, it, expect } from 'bun:test';
import {
  parseQuery,
  isTestFile,
  isConfigFile,
  isDocFile,
  detectLanguage,
} from './src/search';

describe('parseQuery', () => {
  it('parses simple query', () => {
    const result = parseQuery('auth middleware');
    expect(result.terms).toEqual(['auth', 'middleware']);
    expect(result.exactTerms).toEqual([]);
  });

  it('extracts exact terms from quotes', () => {
    const result = parseQuery('"user service" auth');
    expect(result.exactTerms).toEqual(['user service']);
    expect(result.terms).toEqual(['auth']);
  });

  it('extracts file types from extensions', () => {
    const result = parseQuery('user .ts .js');
    expect(result.fileTypes).toEqual(['.ts', '.js']);
  });

  it('detects test intent', () => {
    const result = parseQuery('user test');
    expect(result.wantTests).toBe(true);
  });

  it('detects test intent with specs', () => {
    const result = parseQuery('auth specs');
    expect(result.wantTests).toBe(true);
  });

  it('detects config intent', () => {
    const result = parseQuery('database config');
    expect(result.wantConfigs).toBe(true);
  });

  it('detects config intent with settings', () => {
    const result = parseQuery('app settings');
    expect(result.wantConfigs).toBe(true);
  });

  it('detects docs intent', () => {
    const result = parseQuery('api documentation');
    expect(result.wantDocs).toBe(true);
  });

  it('extracts language from query', () => {
    const result = parseQuery('user typescript');
    expect(result.fileTypes).toContain('.ts');
  });

  it('removes duplicates', () => {
    const result = parseQuery('auth auth middleware');
    expect(result.terms).toEqual(['auth', 'middleware']);
  });

  it('handles empty query', () => {
    const result = parseQuery('');
    expect(result.terms).toEqual([]);
    expect(result.exactTerms).toEqual([]);
  });
});

describe('isTestFile', () => {
  it('detects .test.ts files', () => {
    expect(isTestFile('user.test.ts')).toBe(true);
  });

  it('detects .spec.ts files', () => {
    expect(isTestFile('user.spec.ts')).toBe(true);
  });

  it('detects test directories', () => {
    expect(isTestFile('tests/user.test.ts')).toBe(true);
  });

  it('detects __tests__ directories', () => {
    expect(isTestFile('__tests__/user.test.ts')).toBe(true);
  });

  it('returns false for non-test files', () => {
    expect(isTestFile('user.ts')).toBe(false);
    expect(isTestFile('src/user.ts')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isTestFile('User.TEST.ts')).toBe(true);
  });
});

describe('isConfigFile', () => {
  it('detects files with config in name', () => {
    expect(isConfigFile('webpack.config.js')).toBe(true);
    expect(isConfigFile('vite.config.ts')).toBe(true);
  });

  it('detects config directories', () => {
    expect(isConfigFile('config/settings.js')).toBe(true);
    expect(isConfigFile('configs/app.json')).toBe(true);
  });

  it('detects rc files', () => {
    expect(isConfigFile('.eslintrc')).toBe(true);
    expect(isConfigFile('.npmrc')).toBe(true);
  });

  it('returns false for non-config files', () => {
    expect(isConfigFile('user.ts')).toBe(false);
    expect(isConfigFile('README.md')).toBe(false);
    expect(isConfigFile('app.json')).toBe(false);
    expect(isConfigFile('Cargo.toml')).toBe(false);
  });
});

describe('isDocFile', () => {
  it('detects README files', () => {
    expect(isDocFile('README.md')).toBe(true);
  });

  it('detects CHANGELOG files', () => {
    expect(isDocFile('CHANGELOG.md')).toBe(true);
  });

  it('detects doc directories', () => {
    expect(isDocFile('docs/api.md')).toBe(true);
  });

  it('returns false for non-doc files', () => {
    expect(isDocFile('user.ts')).toBe(false);
    expect(isDocFile('config.json')).toBe(false);
  });
});

describe('detectLanguage', () => {
  it('detects TypeScript', () => {
    expect(detectLanguage('user.ts')).toBe('typescript');
    expect(detectLanguage('user.tsx')).toBe('typescript');
  });

  it('detects JavaScript', () => {
    expect(detectLanguage('user.js')).toBe('javascript');
    expect(detectLanguage('user.jsx')).toBe('javascript');
  });

  it('detects Python', () => {
    expect(detectLanguage('user.py')).toBe('python');
  });

  it('detects Rust', () => {
    expect(detectLanguage('user.rs')).toBe('rust');
  });

  it('detects Go', () => {
    expect(detectLanguage('user.go')).toBe('go');
  });

  it('detects Java', () => {
    expect(detectLanguage('User.java')).toBe('java');
  });

  it('detects C/C++', () => {
    expect(detectLanguage('user.c')).toBe('c');
    expect(detectLanguage('user.cpp')).toBe('cpp');
    expect(detectLanguage('user.h')).toBe('c');
  });

  it('returns undefined for unknown extensions', () => {
    expect(detectLanguage('user.xyz')).toBeUndefined();
    expect(detectLanguage('Makefile')).toBeUndefined();
  });

  it('is case insensitive', () => {
    expect(detectLanguage('user.TS')).toBe('typescript');
    expect(detectLanguage('user.PY')).toBe('python');
  });
});
