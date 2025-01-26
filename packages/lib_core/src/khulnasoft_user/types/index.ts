// FIXME: Create package for graphql utils and move KhulnaSoftGID there
// https://github.com/khulnasoft/khulnasoft-lsp/-/issues/652
type KhulnaSoftGID = `gid://gitlab/${string}/${string | number}`;

export interface KhulnaSoftUser {
  restId: number;
  gqlId: KhulnaSoftGID;
  username: string;
  name: string;
}
