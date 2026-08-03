// Declares CSS imports used by the Expo web starter components retained during migration.

declare module '*.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
