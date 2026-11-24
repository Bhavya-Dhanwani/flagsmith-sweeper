import { Node, Project, SyntaxKind, type CallExpression } from "ts-morph";

const BOOL_CALL = /(?:^|\.)(?:isEnabled|hasFeature)$/;

/** Rewrites `source`, collapsing every boolean flag check in `state` (flag -> on/off). */
export function fixSource(source: string, state: Map<string, boolean>): string {
  const sf = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } }).createSourceFile("f.ts", source);
  const find = () =>
    sf.getDescendantsOfKind(SyntaxKind.CallExpression).find((c) => {
      const a = c.getArguments()[0];
      return BOOL_CALL.test(c.getExpression().getText()) && a && Node.isStringLiteral(a) && state.has(a.getLiteralValue());
    });

  for (let c: CallExpression | undefined; (c = find()); ) {
    let value = state.get((c.getArguments()[0] as any).getLiteralValue())!;
    let node: Node = c;
    for (;;) {
      const p = node.getParent()!;
      if (Node.isParenthesizedExpression(p)) node = p;
      else if (Node.isPrefixUnaryExpression(p) && p.getOperatorToken() === SyntaxKind.ExclamationToken) { value = !value; node = p; }
      else break;
    }
    const p = node.getParent()!;
    if (Node.isIfStatement(p) && p.getExpression() === node) {
      const keep = value ? p.getThenStatement() : p.getElseStatement();
      const container = p.getParent()!;
      const flat = Node.isBlock(container) || Node.isSourceFile(container) || Node.isCaseClause(container) || Node.isDefaultClause(container);
      if (!keep) { flat ? p.remove() : p.replaceWithText("{}"); continue; }
      if (!Node.isBlock(keep)) { p.replaceWithText(keep.getText()); continue; }
      if (!flat) { p.replaceWithText(keep.getText()); continue; }
      const lines = keep.getText().slice(1, -1).replace(/^\s*\n/, "").replace(/\s+$/, "").split("\n");
      const pad = (s: string) => s.match(/^\s*/)![0].length;
      const min = Math.min(...lines.filter((l) => l.trim()).map(pad), Infinity);
      const indent = " ".repeat(p.getIndentationText().length);
      p.replaceWithText(lines.map((l) => (l.trim() ? indent + l.slice(min) : "")).join("\n").trimStart());
    } else if (Node.isConditionalExpression(p) && p.getCondition() === node) {
      p.replaceWithText((value ? p.getWhenTrue() : p.getWhenFalse()).getText());
    } else {
      node.replaceWithText(String(value)); // fallback: `a && flag` -> `a && true`, tidy by hand
    }
  }
  return sf.getFullText();
}
