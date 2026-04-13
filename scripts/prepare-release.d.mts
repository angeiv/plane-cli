export interface PrepareReleaseOptions {
  outDir: string;
  tag: string;
  verifyOnly: boolean;
}

export declare function parseArgs(argv: string[]): PrepareReleaseOptions;
export declare function expectedTagForVersion(version: string): string;
export declare function assertReleaseTagMatchesVersion(tag: string, version: string): void;
export declare function buildSha256Line(filename: string, buffer: Uint8Array): string;
