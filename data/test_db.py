import sqlite3
conn = sqlite3.connect("./data/chinook.db")
print(conn.execute(
    "SELECT artists.Name AS artist, COUNT(*) AS total_albums \
    FROM albums \
    JOIN artists ON albums.ArtistId = artists.ArtistId \
    GROUP BY artists.Name \
    ORDER BY total_albums DESC \
    LIMIT 5;")\
.fetchall())

conn.close()    