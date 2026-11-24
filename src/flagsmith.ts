import type { Flag } from "./compare.js";

export async function fetchFlags(base: string, token: string, projectId: string, envKey: string): Promise<Flag[]> {
  const get = async (path: string) => {
    const r = await fetch(`${base}/api/v1${path}`, { headers: { authorization: `Token ${token}` } });
    if (!r.ok) throw new Error(`Flagsmith ${path} -> ${r.status}`);
    return (await r.json()) as { results: any[] };
  };
  const [features, states] = await Promise.all([
    get(`/projects/${projectId}/features/?page_size=500`),
    get(`/environments/${envKey}/featurestates/?page_size=500`),
  ]);
  const enabled = new Map(states.results.filter((s) => !s.identity && !s.feature_segment).map((s) => [s.feature, s.enabled]));
  return features.results.filter((f) => !f.is_archived).map((f) => ({ name: f.name, enabled: !!enabled.get(f.id) }));
}
