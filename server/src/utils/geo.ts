export async function fetchGeo(ip: string): Promise<string> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city,isp,org,as`)
    if (res.ok) return JSON.stringify(await res.json())
  } catch {}
  return '{}'
}
