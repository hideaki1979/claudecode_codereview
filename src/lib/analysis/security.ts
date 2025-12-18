/**
 * Security Vulnerability Scanner
 *
 * PR差分からセキュリティ脆弱性を検出するモジュール。
 * - ハードコードされたシークレット検出（API Key, Token, Password）
 * - OWASP Top 10ベースの脆弱性パターンマッチング
 * - 言語別セキュリティルール（TypeScript/JavaScript優先）
 * - 安全でない依存関係の検出
 */

import type { GitHubDiff } from '@/types/github';

/**
 * セキュリティパターンの重大度
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * セキュリティパターン定義
 */
interface SecurityPattern {
  name: string;
  pattern: RegExp;
  severity: SecuritySeverity;
  message: string;
}

/**
 * セキュリティパターンカテゴリ
 */
const SECURITY_PATTERNS: Record<string, SecurityPattern[]> = {
  // ハードコードされたシークレット
  secrets: [
    {
      name: 'API Key',
      pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*["']?([a-zA-Z0-9_\-]{20,})/gi,
      severity: 'high',
      message: 'ハードコードされたAPI Keyが検出されました',
    },
    {
      name: 'Private Key',
      pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
      severity: 'critical',
      message: '秘密鍵がコードに含まれています',
    },
    {
      name: 'Password',
      pattern: /(?:password|passwd|pwd)\s*[=:]\s*["']([^"'\s]{8,})/gi,
      severity: 'high',
      message: 'ハードコードされたパスワードが検出されました',
    },
    {
      name: 'AWS Access Key',
      pattern: /AKIA[0-9A-Z]{16}/gi,
      severity: 'critical',
      message: 'AWS Access Keyが検出されました',
    },
    {
      name: 'AWS Secret Key',
      pattern: /(?:aws)?_?secret_?(?:access)?_?key\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})/gi,
      severity: 'critical',
      message: 'AWS Secret Keyが検出されました',
    },
    {
      name: 'GitHub Token',
      pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/gi,
      severity: 'critical',
      message: 'GitHub Personal Access Tokenが検出されました',
    },
    {
      name: 'JWT Token',
      pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/gi,
      severity: 'high',
      message: 'JWT Tokenがハードコードされています',
    },
    {
      name: 'Generic Secret',
      pattern: /(?:secret|token|auth)\s*[=:]\s*["']([^"'\s]{16,})/gi,
      severity: 'medium',
      message: 'シークレット値がハードコードされている可能性があります',
    },
  ],

  // SQLインジェクション
  sqlInjection: [
    {
      name: 'SQL Concatenation',
      pattern: /(?:query|sql|execute)\s*\([^)]*\+\s*(?:\w+|\$\{)/gi,
      severity: 'high',
      message: 'SQLクエリの文字列連結が検出されました（SQLインジェクションの可能性）',
    },
    {
      name: 'Raw SQL Query',
      pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\s+.*\$\{/gi,
      severity: 'high',
      message: 'テンプレートリテラル内のSQLクエリが検出されました（SQLインジェクションの可能性）',
    },
  ],

  // XSS脆弱性
  xss: [
    {
      name: 'dangerouslySetInnerHTML',
      pattern: /dangerouslySetInnerHTML/gi,
      severity: 'medium',
      message: 'dangerouslySetInnerHTMLの使用が検出されました（XSSリスク）',
    },
    {
      name: 'eval usage',
      pattern: /\beval\s*\(/gi,
      severity: 'high',
      message: 'eval()の使用が検出されました',
    },
    {
      name: 'innerHTML assignment',
      pattern: /\.innerHTML\s*=/gi,
      severity: 'medium',
      message: 'innerHTMLへの直接代入が検出されました（XSSリスク）',
    },
    {
      name: 'document.write',
      pattern: /document\.write\s*\(/gi,
      severity: 'medium',
      message: 'document.write()の使用が検出されました（XSSリスク）',
    },
  ],

  // コマンドインジェクション
  commandInjection: [
    {
      name: 'exec usage',
      pattern: /(?:child_process|exec|execSync|spawn|spawnSync)\s*\([^)]*\$\{/gi,
      severity: 'high',
      message: 'シェルコマンドの動的実行が検出されました（コマンドインジェクションの可能性）',
    },
    {
      name: 'Shell execution',
      pattern: /(?:shell|bash|sh)\s*[=:]\s*true/gi,
      severity: 'medium',
      message: 'シェル実行オプションが有効になっています',
    },
  ],

  // 安全でない設定
  insecureConfig: [
    {
      name: 'CORS any origin',
      pattern: /(?:Access-Control-Allow-Origin|cors)\s*[=:]\s*["']\*/gi,
      severity: 'medium',
      message: 'CORS設定でワイルドカード(*)が使用されています',
    },
    {
      name: 'Disabled security',
      pattern: /(?:security|csrf|xss|ssl|tls|verify)\s*[=:]\s*(?:false|disabled)/gi,
      severity: 'high',
      message: 'セキュリティ機能が無効化されています',
    },
    {
      name: 'HTTP instead of HTTPS',
      pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi,
      severity: 'low',
      message: 'HTTPプロトコルが使用されています（HTTPSを推奨）',
    },
  ],

  // 安全でない依存関係
  dependencies: [
    {
      name: 'Deprecated request package',
      pattern: /["']request["']\s*:/gi,
      severity: 'medium',
      message: '非推奨パッケージ "request" が使用されています',
    },
    {
      name: 'Deprecated npm package',
      pattern: /["'](?:crypto-js|node-uuid|colors|faker)["']\s*:/gi,
      severity: 'low',
      message: '注意が必要なパッケージが検出されました',
    },
  ],

  // 認証・認可の問題
  authIssues: [
    {
      name: 'Hardcoded credentials',
      pattern: /(?:username|user|login)\s*[=:]\s*["'][^"']+["']\s*[,;]\s*(?:password|pass|pwd)\s*[=:]\s*["'][^"']+["']/gi,
      severity: 'critical',
      message: 'ハードコードされた認証情報が検出されました',
    },
    {
      name: 'No auth check',
      pattern: /\/\/\s*(?:TODO|FIXME|XXX)\s*:?\s*(?:add|implement|check)\s*auth/gi,
      severity: 'medium',
      message: '認証処理の実装が未完了の可能性があります',
    },
  ],
};

/**
 * セキュリティ問題の詳細
 */
export interface SecurityIssue {
  type: string;
  severity: SecuritySeverity;
  message: string;
  file: string;
  line?: number;
  snippet?: string;
}

/**
 * セキュリティメトリクス
 */
export interface SecurityMetrics {
  issues: SecurityIssue[];
  issue_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  security_score: number;
  security_level: 'safe' | 'warning' | 'danger' | 'critical';
}

/**
 * 追加行のみを抽出し、行番号を推定
 */
function extractAddedLines(patch: string): Array<{ content: string; lineNumber: number }> {
  const lines = patch.split('\n');
  const addedLines: Array<{ content: string; lineNumber: number }> = [];
  let currentLine = 0;

  for (const line of lines) {
    // hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@\s*-\d+(?:,\d+)?\s*\+(\d+)(?:,\d+)?\s*@@/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10);
      continue;
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push({
        content: line.substring(1),
        lineNumber: currentLine,
      });
      currentLine++;
    } else if (!line.startsWith('-')) {
      currentLine++;
    }
  }

  return addedLines;
}

/**
 * PR差分からセキュリティ問題を検出
 */
export function analyzeSecurity(diff: GitHubDiff): SecurityMetrics {
  const issues: SecurityIssue[] = [];

  // 各ファイルの変更内容をスキャン
  for (const file of diff.files) {
    const patch = file.patch || '';
    const filename = file.filename;

    // 追加行のみを抽出
    const addedLines = extractAddedLines(patch);
    const addedContent = addedLines.map((l) => l.content).join('\n');

    // 全パターンをチェック
    for (const [, patterns] of Object.entries(SECURITY_PATTERNS)) {
      for (const patternDef of patterns) {
        // パターンをリセット（グローバルフラグのため）
        patternDef.pattern.lastIndex = 0;

        const matches = addedContent.matchAll(patternDef.pattern);

        for (const match of matches) {
          // マッチした箇所の行番号を推定
          const matchIndex = match.index ?? 0;
          const contentBeforeMatch = addedContent.substring(0, matchIndex);
          const linesBefore = contentBeforeMatch.split('\n').length;
          const lineInfo = addedLines[linesBefore - 1];

          issues.push({
            type: patternDef.name,
            severity: patternDef.severity,
            message: patternDef.message,
            file: filename,
            line: lineInfo?.lineNumber,
            snippet: match[0].substring(0, 100),
          });
        }
      }
    }
  }

  // 重複を除去
  const uniqueIssues = issues.filter(
    (issue, index, self) =>
      index ===
      self.findIndex(
        (i) =>
          i.type === issue.type &&
          i.file === issue.file &&
          i.line === issue.line
      )
  );

  // メトリクス計算
  const criticalCount = uniqueIssues.filter((i) => i.severity === 'critical').length;
  const highCount = uniqueIssues.filter((i) => i.severity === 'high').length;
  const mediumCount = uniqueIssues.filter((i) => i.severity === 'medium').length;
  const lowCount = uniqueIssues.filter((i) => i.severity === 'low').length;

  // セキュリティスコア計算（0-100）
  const securityScore = Math.max(
    0,
    100 - (criticalCount * 40 + highCount * 20 + mediumCount * 10 + lowCount * 5)
  );

  // セキュリティレベル判定
  let securityLevel: SecurityMetrics['security_level'];
  if (criticalCount > 0) {
    securityLevel = 'critical';
  } else if (highCount > 0) {
    securityLevel = 'danger';
  } else if (mediumCount > 0) {
    securityLevel = 'warning';
  } else {
    securityLevel = 'safe';
  }

  return {
    issues: uniqueIssues,
    issue_count: uniqueIssues.length,
    critical_count: criticalCount,
    high_count: highCount,
    medium_count: mediumCount,
    low_count: lowCount,
    security_score: securityScore,
    security_level: securityLevel,
  };
}

/**
 * 空のセキュリティメトリクスを作成
 */
export function createEmptySecurityMetrics(): SecurityMetrics {
  return {
    issues: [],
    issue_count: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    security_score: 100,
    security_level: 'safe',
  };
}
