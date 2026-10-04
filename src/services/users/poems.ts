export type PoemRef = {
  link: string;
  title: string;
  poetLabel: string;
  /** First verse, plain text, for share captions. Optional: older flows do not set it. */
  excerpt?: string;
};
