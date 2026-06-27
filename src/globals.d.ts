
declare const SUPABASE_URL: string;
declare const SUPABASE_ANON_KEY: string;
declare const pdfjsLib: any;

declare module '*?url' {
  const content: string;
  export default content;
}
