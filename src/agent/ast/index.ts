// ============================================================
// AST Normalizer 公共出口
// ============================================================

export { normalizeAST } from "./normalize";
export { sanitizeKey, uniqueSibling } from "./ids";
export { GeneratorASTNodeSchema } from "./schema";
export type { GeneratorASTNode } from "./schema";
export { validateDesignConstraints } from "./validate";
export type { DesignConstraintIssue, DesignConstraintCategory } from "./validate";
