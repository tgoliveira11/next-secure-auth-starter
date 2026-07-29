import packageMetadata from "../../package.json";

/** Published package version, embedded from the package manifest during the build. */
export const SECURE_AUTH_PACKAGE_VERSION: string = packageMetadata.version;
