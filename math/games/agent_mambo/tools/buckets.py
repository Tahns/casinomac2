import csv, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "library")
m = sys.argv[1]
rows = [(int(a), int(b), int(p)/100) for a, b, p in csv.reader(open(f"{D}/publish_files/lookUpTable_{m}_0.csv"))]
W = sum(w for _, w, _ in rows)
edges = [0,0.001,1,2,5,10,20,40,60,100,200,500,1000,2000,3000,4999,5000.01]
for lo, hi in zip(edges, edges[1:]):
    sel = [(w, p) for _, w, p in rows if lo <= p < hi] if lo else [(w,p) for _,w,p in rows if p==0]
    pw = sum(w for w, _ in sel)/W
    print(f"{lo:>7}-{hi:<8} p={pw:.5f} rtp_share={sum(w*p for w,p in sel)/W:.4f}")
