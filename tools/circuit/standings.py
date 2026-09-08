"""Build-time standings for the race: trailing 30-day commit counts per repo,
through the signed-in GitHub CLI (gh), written to circuit/standings.json.
Never runs in the browser.

Deploy path: a production build (Netlify, Pages) has no gh and no auth, so
this script is best effort by default: if gh is missing or the fetch
fails, it prints a note, leaves the committed standings.json exactly as it
is, and exits 0. The committed file ships. Refresh it locally, where gh is
signed in, and commit the result. Pass --strict to make a failure exit 1.
Usage: python3 tools/circuit/standings.py [--strict]"""
import json, os, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATH = os.path.join(ROOT, "circuit", "standings.json")

def count_commits(repo, since):
    try:
        out = subprocess.run(["gh", "api", "--paginate", f"repos/{repo}/commits?since={since}&per_page=100"],
                             capture_output=True, text=True, timeout=60)
    except FileNotFoundError:
        raise RuntimeError("gh is not installed on this machine")
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:200])
    dec, pos, n, text = json.JSONDecoder(), 0, 0, out.stdout.strip()
    while pos < len(text):
        while pos < len(text) and text[pos] in " \n\r\t": pos += 1
        if pos >= len(text): break
        page, pos = dec.raw_decode(text, pos)
        n += len(page)
    return n

def main():
    data = json.load(open(PATH))
    days = int(data.get("window_days", 30))
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    since = (now - datetime.timedelta(days=days)).isoformat().replace("+00:00", "Z")
    fresh = []
    try:
        for car in data["cars"]:
            n = count_commits(car["repo"], since)
            fresh.append(dict(car, commits=n))
    except Exception as e:
        strict = "--strict" in sys.argv
        print(f"standings: could not refresh ({e}); shipping the committed circuit/standings.json"
              f" (generated {data.get('generated')}, order {data.get('order')})", file=sys.stderr)
        sys.exit(1 if strict else 0)
    order = [c["id"] for c in sorted(fresh, key=lambda c: (-c["commits"], c["name"].lower()))]
    data.update({"generated": now.isoformat().replace("+00:00", "Z"), "since": since, "cars": fresh, "order": order})
    json.dump(data, open(PATH, "w"), indent=2); open(PATH, "a").write("\n")
    for c in sorted(fresh, key=lambda c: order.index(c["id"])):
        print(f"{order.index(c['id']) + 1}. {c['name']:24} {c['repo']:36} {c['commits']:4} commits since {since[:10]}")

if __name__ == "__main__":
    main()
