export interface NodeData extends Record<string, unknown> {
  label: string;
  type: 'wallet' | 'protocol';
}
