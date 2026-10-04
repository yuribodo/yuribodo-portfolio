import { ASSET_VERSIONS } from './asset-versions';

/** Same URL in HTML preloads and Three's loaders, including fetch credentials. */
export function lobbyAssetUrl(url: string) {
  const version = ASSET_VERSIONS[url];
  return version ? `${url}?v=${version}` : url;
}
