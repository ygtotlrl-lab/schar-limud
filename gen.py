import os
repo = r"C:\Users\F\AppData\Local\Temp\schar-limud-repo"
parts = []
parts.append(open(os.path.join(repo, "sl_p1.txt"), encoding="utf-8").read())
parts.append(open(os.path.join(repo, "sl_p2.txt"), encoding="utf-8").read())
parts.append(open(os.path.join(repo, "sl_p3.txt"), encoding="utf-8").read())
with open(os.path.join(repo, "index.html"), "w", encoding="utf-8") as f:
    f.write("".join(parts))
print("OK", sum(len(p) for p in parts))
