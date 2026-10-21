interface TokenExtension {
  id: string;
  source: string;
  css: { light: string; dark?: string };
  modes?: { dark: unknown };
  representable?: boolean;
}

interface Token {
  $type?: string;
  $value: unknown;
  $extensions: { "org.liquorify": TokenExtension };
}

export type TokenDocument = Record<string, unknown>;

interface Color {
  hex: string;
}

function tokenAt(document: TokenDocument, alias: string): Token | undefined {
  const [group, name] = alias.slice(1, -1).split(".");
  return (document[group] as Record<string, Token> | undefined)?.[name];
}

/** A token's value in one mode, following aliases through the file. */
function valueIn(
  document: TokenDocument,
  token: Token,
  mode: "light" | "dark",
): unknown {
  const extension = token.$extensions["org.liquorify"];
  const value =
    mode === "dark" && extension.modes ? extension.modes.dark : token.$value;
  if (typeof value === "string" && value.startsWith("{")) {
    const target = tokenAt(document, value);
    return target ? valueIn(document, target, mode) : value;
  }
  return value;
}

function isColor(value: unknown): value is Color {
  return typeof value === "object" && value !== null && "hex" in value;
}

function describe(value: unknown): string {
  if (isColor(value)) return value.hex;
  if (Array.isArray(value)) {
    return value.every((part) => typeof part === "string")
      ? value.join(", ")
      : `${value.length} ${value.length === 1 ? "layer" : "layers"}`;
  }
  if (typeof value === "object" && value !== null && "unit" in value) {
    const { value: amount, unit } = value as { value: number; unit: string };
    return `${amount}${unit}`;
  }
  return String(value);
}

function FileValue({ value }: { value: unknown }) {
  return (
    <span className="flex items-center gap-2 font-mono text-xs">
      {isColor(value) && (
        <span
          className="inline-block size-6 shrink-0 rounded border border-border"
          style={{ background: value.hex }}
        />
      )}
      {describe(value)}
    </span>
  );
}

/**
 * The tokens of a token file whose IDs match, with the stylesheet's light
 * and dark values, the file's values, and what the browser computes on this
 * light page. Shoppers never see the dark values (LIQ-010 §3.3).
 */
export function TokenTable({
  document,
  idPattern,
}: {
  document: TokenDocument;
  idPattern: RegExp;
}) {
  const entries = Object.entries(document).flatMap(([group, tokens]) =>
    group.startsWith("$")
      ? []
      : Object.entries(tokens as Record<string, Token>)
          .filter(([, token]) =>
            idPattern.test(token.$extensions["org.liquorify"].id),
          )
          .map(([name, token]) => ({ group, name, token })),
  );
  const root = getComputedStyle(window.document.documentElement);

  return (
    <table className="w-full text-left text-sm text-foreground">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="pb-2 font-medium">ID</th>
          <th className="pb-2 font-medium">Token</th>
          <th className="pb-2 font-medium">Stylesheet</th>
          <th className="pb-2 font-medium">Light</th>
          <th className="pb-2 font-medium">Dark (declared, not shown)</th>
          <th className="pb-2 font-medium">Browser</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(({ group, name, token }) => {
          const extension = token.$extensions["org.liquorify"];
          const cssName = `--${name}`;
          const computed = root.getPropertyValue(cssName).trim();
          return (
            <tr
              key={`${group}.${name}`}
              className="border-t border-border align-top"
            >
              <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                {extension.id}
              </td>
              <td className="py-2 pr-4 font-mono text-xs">{cssName}</td>
              <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                {extension.css.light}
                {extension.css.dark && <div>{extension.css.dark}</div>}
              </td>
              <td className="py-2 pr-4">
                <FileValue value={valueIn(document, token, "light")} />
              </td>
              <td className="py-2 pr-4">
                {extension.modes && (
                  <FileValue value={valueIn(document, token, "dark")} />
                )}
              </td>
              <td className="py-2 font-mono text-xs">
                {computed || (
                  <span className="text-muted-foreground">not emitted</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
