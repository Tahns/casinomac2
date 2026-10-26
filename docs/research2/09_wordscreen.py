"""Word screen for the proposed Agent Mambo names and UI strings (09_theme_lore_names.md).

Checks each string against (a) the social-casino forbidden words from
00_ENGINE_SELFCHECK_PROMPT.md (whole word, case-insensitive; substring hits are
flagged as traps), and (b) the Engine title bans plus rival vocabulary.
Screening aid only: it does not replace the Stake Studio review.
Run: python3 -I docs/research2/09_wordscreen.py
"""
import re

SOCIAL = ["at the cost of", "be awarded to player's accounts", "bet", "bets", "betting", "bonus buy",
          "bought", "buy", "buy bonus", "cash", "cost of", "credit", "currency", "deposit", "fund",
          "win feature", "gamble", "money", "paid", "paid out", "pay", "pay out", "payer", "pays",
          "pays out", "place your bets", "purchase", "rebet", "stake", "total bet", "wager",
          "withdraw", "paytable", "pay table"]
TITLE_AND_RIVAL = ["megaways", "xways", "enhanced", "boosted", "rtp", "gates of", "bonanza", "olympus",
                   "rush", "kraken", "waylanders", "intel", "boost", "super", "hyper"]

STRINGS = """Agent Mambo|The Mezzanine Bureau|Office of Polite Inquiries|Bureau of Syncopation|Bureau of Quiet Affairs
San Syncopa|Blue Octave|Discretion, in four-four.|The Registrar|Dr. Odile Brasswick|Cora Vestry|Professor Pianissimo
Madame Sordina|Mabel Mambo Fontaine|Mission Briefing|The Briefing|Mission Meter|Clearance Dial|Classified Dossier
Secret Entrance|Stage Door|Service Stairs|Coat Check|Freight Elevator|Mambo Star|The Fuse|Fuse Line|The Long Fuse
Sealed Orders|Ballroom Blackout|Cover Blown|Midnight Unmasking|Cloakroom Caper|Cipher Salon|Night Beat
Operation Fade-Out|Midnight Switchboard|Largo|Andante|Allegro|Presto|Lobby|Mezzanine|Atrium|Annex|Ballroom|Rooftop
Sub-Basement|Filed Under Fabulous|Cleared for Applause|Top Drawer|Stamped and Sealed|File Closed, Mambo Style
DECLASSIFIED|FILED|SEALED|OPENED|REDACTED|MISSION START|MISSION COMPLETE|INCOMING TELEGRAM|Decoding...
Ticket {n} filed|File No. {id}|Debrief done.|File closed.|Fabulous, darling.|Press and hum.|Cover intact.
Symbol Wins|Win table|The Index|Seltzer Siphon|Hat-box|Vault Safe|Hi-Fi Vinyl|Bongos|Fedora|Rotary Phone|Magnifier|Bow Tie|Contents: classified.|Handle with seltzer.|Side B holds the cipher.|Rhythm section, on call.|Brim down, cover up.|Party line, private matters.|Small print, large clues.|Dressed to file.|Wild. Substitutes for everything but dossiers.|Three or more open a briefing.|The art changes with the dial. The wins do not.|FILED|STAMPED|EMBOSSED|OFFSET PRINT
Stakeout|Payload|Alphabet Soup|Better Luck|Discredit|Penthouse|Dead Air|Ultracode""".replace("\n", "|").split("|")

def scan(s):
    low, hits = s.lower(), []
    for w in SOCIAL:
        if re.search(r"\b" + re.escape(w) + r"\b", low):
            hits.append(("WORD", w))
        elif len(w) >= 3 and w in low:
            hits.append(("SUBSTRING-TRAP", w))
    for w in TITLE_AND_RIVAL:
        if re.search(r"\b" + re.escape(w) + r"\b", low):
            hits.append(("TITLE-OR-RIVAL", w))
    return hits

if __name__ == "__main__":
    for s in STRINGS:
        h = scan(s)
        print(("OK   " if not h else "HIT  ") + s + ("" if not h else "  " + str(h)))
