"""
Song Recommendation Model Trainer
Generates a song dataset if not present, and trains a content-based recommendation model.
Saves pickle files for the Flask ML service.
"""

import os
import sys
import pandas as pd
import numpy as np
import pickle
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Fix Windows console encoding
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "songs")
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")


def get_decade(year):
    """Convert a publication year to a decade string like '1990s'."""
    try:
        y = int(year)
        if y < 1900 or y > 2099:
            return "unknown"
        decade = (y // 10) * 10
        return f"{decade}s"
    except (ValueError, TypeError):
        return "unknown"


def generate_default_dataset():
    """Generates a default popular songs dataset to bootstrap the songs domain."""
    print("[*] Generating default popular songs dataset...")
    
    # 30 major artists across multiple genres, each with ~15 popular tracks.
    artists_data = {
        "The Beatles": {
            "genre": "Rock",
            "tracks": [
                ("Yesterday", "Help!", 1965),
                ("Hey Jude", "Single", 1968),
                ("Let It Be", "Let It Be", 1970),
                ("Come Together", "Abbey Road", 1969),
                ("Here Comes the Sun", "Abbey Road", 1969),
                ("Something", "Abbey Road", 1969),
                ("Help!", "Help!", 1965),
                ("A Hard Day's Night", "A Hard Day's Night", 1964),
                ("Strawberry Fields Forever", "Magical Mystery Tour", 1967),
                ("Penny Lane", "Magical Mystery Tour", 1967),
                ("Eleanor Rigby", "Revolver", 1966),
                ("Yellow Submarine", "Revolver", 1966),
                ("In My Life", "Rubber Soul", 1965),
                ("Twist and Shout", "Please Please Me", 1963),
                ("All You Need Is Love", "Magical Mystery Tour", 1967)
            ]
        },
        "Michael Jackson": {
            "genre": "Pop",
            "tracks": [
                ("Thriller", "Thriller", 1982),
                ("Billie Jean", "Thriller", 1982),
                ("Beat It", "Thriller", 1982),
                ("Smooth Criminal", "Bad", 1987),
                ("Bad", "Bad", 1987),
                ("Man in the Mirror", "Bad", 1987),
                ("Black or White", "Dangerous", 1991),
                ("Don't Stop 'Til You Get Enough", "Off the Wall", 1979),
                ("Rock with You", "Off the Wall", 1979),
                ("The Way You Make Me Feel", "Bad", 1987),
                ("Remember the Time", "Dangerous", 1991),
                ("Heal the World", "Dangerous", 1991),
                ("Wanna Be Startin' Somethin'", "Thriller", 1982),
                ("Earth Song", "HIStory", 1995),
                ("You Are Not Alone", "HIStory", 1995)
            ]
        },
        "Queen": {
            "genre": "Rock",
            "tracks": [
                ("Bohemian Rhapsody", "A Night at the Opera", 1975),
                ("Don't Stop Me Now", "Jazz", 1978),
                ("We Will Rock You", "News of the World", 1977),
                ("We Are the Champions", "News of the World", 1977),
                ("Another One Bites the Dust", "The Game", 1980),
                ("Under Pressure", "Hot Space", 1981),
                ("Somebody to Love", "A Day at the Races", 1976),
                ("Killer Queen", "Sheer Heart Attack", 1974),
                ("Radio Ga Ga", "The Works", 1984),
                ("I Want to Break Free", "The Works", 1984),
                ("Crazy Little Thing Called Love", "The Game", 1980),
                ("The Show Must Go On", "Innuendo", 1991),
                ("Love of My Life", "A Night at the Opera", 1975),
                ("Fat Bottomed Girls", "Jazz", 1978),
                ("Who Wants to Live Forever", "A Kind of Magic", 1986)
            ]
        },
        "Taylor Swift": {
            "genre": "Pop",
            "tracks": [
                ("Love Story", "Fearless", 2008),
                ("You Belong With Me", "Fearless", 2008),
                ("Blank Space", "1989", 2014),
                ("Shake It Off", "1989", 2014),
                ("Cardigan", "Folklore", 2020),
                ("Willow", "Evermore", 2020),
                ("Anti-Hero", "Midnights", 2022),
                ("Cruel Summer", "Lover", 2019),
                ("Lover", "Lover", 2019),
                ("All Too Well", "Red", 2012),
                ("Style", "1989", 2014),
                ("Delicate", "Reputation", 2017),
                ("Bad Blood", "1989", 2014),
                ("Look What You Made Me Do", "Reputation", 2017),
                ("Fortnight", "The Tortured Poets Department", 2024)
            ]
        },
        "Eminem": {
            "genre": "Hip-Hop",
            "tracks": [
                ("Lose Yourself", "8 Mile Soundtrack", 2002),
                ("Without Me", "The Eminem Show", 2002),
                ("The Real Slim Shady", "The Marshall Mathers LP", 2000),
                ("Stan", "The Marshall Mathers LP", 2000),
                ("Love the Way You Lie", "Recovery", 2010),
                ("Not Afraid", "Recovery", 2010),
                ("Mockingbird", "Encore", 2004),
                ("Rap God", "The Marshall Mathers LP 2", 2013),
                ("Till I Collapse", "The Eminem Show", 2002),
                ("When I'm Gone", "Curtain Call: The Hits", 2005),
                ("Cleanin' Out My Closet", "The Eminem Show", 2002),
                ("Like Toy Soldiers", "Encore", 2004),
                ("My Name Is", "The Slim Shady LP", 1999),
                ("The Monster", "The Marshall Mathers LP 2", 2013),
                ("Sing for the Moment", "The Eminem Show", 2002)
            ]
        },
        "Coldplay": {
            "genre": "Alternative",
            "tracks": [
                ("Yellow", "Parachutes", 2000),
                ("Clocks", "A Rush of Blood to the Head", 2002),
                ("The Scientist", "A Rush of Blood to the Head", 2002),
                ("Viva la Vida", "Viva la Vida or Death and All His Friends", 2008),
                ("Fix You", "X&Y", 2005),
                ("Paradise", "Mylo Xyloto", 2011),
                ("Adventure of a Lifetime", "A Head Full of Dreams", 2015),
                ("A Sky Full of Stars", "Ghost Stories", 2014),
                ("Hymn for the Weekend", "A Head Full of Dreams", 2015),
                ("Sparks", "Parachutes", 2000),
                ("Speed of Sound", "X&Y", 2005),
                ("Magic", "Ghost Stories", 2014),
                ("In My Place", "A Rush of Blood to the Head", 2002),
                ("Every Teardrop Is a Waterfall", "Mylo Xyloto", 2011),
                ("Violet Hill", "Viva la Vida", 2008)
            ]
        },
        "The Weeknd": {
            "genre": "R&B",
            "tracks": [
                ("Blinding Lights", "After Hours", 2020),
                ("Starboy", "Starboy", 2016),
                ("The Hills", "Beauty Behind the Madness", 2015),
                ("Can't Feel My Face", "Beauty Behind the Madness", 2015),
                ("Save Your Tears", "After Hours", 2020),
                ("Die for You", "Starboy", 2016),
                ("Call Out My Name", "My Dear Melancholy,", 2018),
                ("I Feel It Coming", "Starboy", 2016),
                ("Earned It", "Beauty Behind the Madness", 2015),
                ("Heartless", "After Hours", 2020),
                ("Wicked Games", "House of Balloons", 2011),
                ("In Your Eyes", "After Hours", 2020),
                ("After Hours", "After Hours", 2020),
                ("Often", "Beauty Behind the Madness", 2015),
                ("Out of Time", "Dawn FM", 2022)
            ]
        },
        "Billie Eilish": {
            "genre": "Pop",
            "tracks": [
                ("Bad Guy", "When We All Fall Asleep, Where Do We Go?", 2019),
                ("Ocean Eyes", "Don't Smile at Me", 2016),
                ("Lovely", "13 Reasons Why Soundtrack", 2018),
                ("When the Party's Over", "When We All Fall Asleep, Where Do We Go?", 2018),
                ("Everything I Wanted", "Single", 2019),
                ("Happier Than Ever", "Happier Than Ever", 2021),
                ("No Time to Die", "No Time to Die Soundtrack", 2020),
                ("What Was I Made For?", "Barbie Soundtrack", 2023),
                ("Bury a Friend", "When We All Fall Asleep, Where Do We Go?", 2019),
                ("Wish You Were Gay", "When We All Fall Asleep, Where Do We Go?", 2019),
                ("Idontwannabeyouanymore", "Don't Smile at Me", 2017),
                ("Bellyache", "Don't Smile at Me", 2017),
                ("My Future", "Happier Than Ever", 2020),
                ("Therefore I Am", "Happier Than Ever", 2020),
                ("Lunch", "Hit Me Hard and Soft", 2024)
            ]
        },
        "Drake": {
            "genre": "Hip-Hop",
            "tracks": [
                ("God's Plan", "Scorpion", 2018),
                ("One Dance", "Views", 2016),
                ("Hotline Bling", "Views", 2016),
                ("In My Feelings", "Scorpion", 2018),
                ("Nice for What", "Scorpion", 2018),
                ("Passionfruit", "More Life", 2017),
                ("Work", "Anti", 2016),
                ("Nonstop", "Scorpion", 2018),
                ("Started from the Bottom", "Nothing Was the Same", 2013),
                ("Hold On, We're Going Home", "Nothing Was the Same", 2013),
                ("Marvins Room", "Take Care", 2011),
                ("Best I Ever Had", "So Far Gone", 2009),
                ("Headlines", "Take Care", 2011),
                ("Laugh Now Cry Later", "Single", 2020),
                ("Rich Baby Daddy", "For All The Dogs", 2023)
            ]
        },
        "Adele": {
            "genre": "Pop",
            "tracks": [
                ("Rolling in the Deep", "21", 2010),
                ("Someone Like You", "21", 2011),
                ("Hello", "25", 2015),
                ("Set Fire to the Rain", "21", 2011),
                ("Easy on Me", "30", 2021),
                ("When We Were Young", "25", 2015),
                ("Send My Love (To Your New Lover)", "25", 2015),
                ("Skyfall", "Skyfall Soundtrack", 2012),
                ("Chasing Pavements", "19", 2008),
                ("Rumour Has It", "21", 2011),
                ("Turning Tables", "21", 2011),
                ("Make You Feel My Love", "19", 2008),
                ("Water Under the Bridge", "25", 2015),
                ("Oh My God", "30", 2021),
                ("Hometown Glory", "19", 2007)
            ]
        },
        "Bruno Mars": {
            "genre": "Pop",
            "tracks": [
                ("Just the Way You Are", "Doo-Wops & Hooligans", 2010),
                ("Grenade", "Doo-Wops & Hooligans", 2010),
                ("Uptown Funk", "Uptown Special", 2014),
                ("Locked Out of Heaven", "Unorthodox Jukebox", 2012),
                ("24K Magic", "24K Magic", 2016),
                ("That's What I Like", "24K Magic", 2016),
                ("Versace on the Floor", "24K Magic", 2016),
                ("When I Was Your Man", "Unorthodox Jukebox", 2012),
                ("Treasure", "Unorthodox Jukebox", 2012),
                ("Marry You", "Doo-Wops & Hooligans", 2010),
                ("Talking to the Moon", "Doo-Wops & Hooligans", 2010),
                ("Leave the Door Open", "An Evening with Silk Sonic", 2021),
                ("Smoking Out The Window", "An Evening with Silk Sonic", 2021),
                ("It Will Rain", "Twilight Saga Soundtrack", 2011),
                ("Count On Me", "Doo-Wops & Hooligans", 2010)
            ]
        },
        "Led Zeppelin": {
            "genre": "Rock",
            "tracks": [
                ("Stairway to Heaven", "Led Zeppelin IV", 1971),
                ("Whole Lotta Love", "Led Zeppelin II", 1969),
                ("Kashmir", "Physical Graffiti", 1975),
                ("Black Dog", "Led Zeppelin IV", 1971),
                ("Ramble On", "Led Zeppelin II", 1969),
                ("Immigrant Song", "Led Zeppelin III", 1970),
                ("Rock and Roll", "Led Zeppelin IV", 1971),
                ("Over the Hills and Far Away", "Houses of the Holy", 1973),
                ("Dazed and Confused", "Led Zeppelin", 1969),
                ("Babe I'm Gonna Leave You", "Led Zeppelin", 1969),
                ("Good Times Bad Times", "Led Zeppelin", 1969),
                ("Since I've Been Loving You", "Led Zeppelin III", 1970),
                ("Going to California", "Led Zeppelin IV", 1971),
                ("Communication Breakdown", "Led Zeppelin", 1969),
                ("Heartbreaker", "Led Zeppelin II", 1969)
            ]
        },
        "Pink Floyd": {
            "genre": "Rock",
            "tracks": [
                ("Another Brick in the Wall (Part 2)", "The Wall", 1979),
                ("Wish You Were Here", "Wish You Were Here", 1975),
                ("Comfortably Numb", "The Wall", 1979),
                ("Time", "The Dark Side of the Moon", 1973),
                ("Money", "The Dark Side of the Moon", 1973),
                ("Breathe (In the Air)", "The Dark Side of the Moon", 1973),
                ("Hey You", "The Wall", 1979),
                ("Shine On You Crazy Diamond", "Wish You Were Here", 1975),
                ("Us and Them", "The Dark Side of the Moon", 1973),
                ("Brain Damage", "The Dark Side of the Moon", 1973),
                ("Eclipse", "The Dark Side of the Moon", 1973),
                ("Mother", "The Wall", 1979),
                ("Have a Cigar", "Wish You Were Here", 1975),
                ("Learning to Fly", "A Momentary Lapse of Reason", 1987),
                ("Run Like Hell", "The Wall", 1979)
            ]
        },
        "Daft Punk": {
            "genre": "Electronic",
            "tracks": [
                ("Get Lucky", "Random Access Memories", 2013),
                ("One More Time", "Discovery", 2000),
                ("Around the World", "Homework", 1997),
                ("Harder Better Faster Stronger", "Discovery", 2001),
                ("Instant Crush", "Random Access Memories", 2013),
                ("Lose Yourself to Dance", "Random Access Memories", 2013),
                ("Technologic", "Human After All", 2005),
                ("Digital Love", "Discovery", 2001),
                ("Da Funk", "Homework", 1995),
                ("Something About Us", "Discovery", 2001),
                ("Give Life Back to Music", "Random Access Memories", 2013),
                ("Giorgio by Moroder", "Random Access Memories", 2013),
                ("Face to Face", "Discovery", 2003),
                ("Television Rules the Nation", "Human After All", 2005),
                ("Veridis Quo", "Discovery", 2001)
            ]
        },
        "Nirvana": {
            "genre": "Rock",
            "tracks": [
                ("Smells Like Teen Spirit", "Nevermind", 1991),
                ("Come as You Are", "Nevermind", 1991),
                ("Lithium", "Nevermind", 1991),
                ("Heart-Shaped Box", "In Utero", 1993),
                ("About a Girl", "Bleach", 1989),
                ("In Bloom", "Nevermind", 1991),
                ("The Man Who Sold the World", "MTV Unplugged in New York", 1994),
                ("All Apologies", "In Utero", 1993),
                ("Dumb", "In Utero", 1993),
                ("Rape Me", "In Utero", 1993),
                ("Pennyroyal Tea", "In Utero", 1993),
                ("Polly", "Nevermind", 1991),
                ("Drain You", "Nevermind", 1991),
                ("Breed", "Nevermind", 1991),
                ("Something in the Way", "Nevermind", 1991)
            ]
        },
        "Beyonce": {
            "genre": "Pop",
            "tracks": [
                ("Single Ladies (Put a Ring on It)", "I Am... Sasha Fierce", 2008),
                ("Halo", "I Am... Sasha Fierce", 2008),
                ("Crazy in Love", "Dangerously in Love", 2003),
                ("Irreplaceable", "B'Day", 2006),
                ("Love On Top", "4", 2011),
                ("Formation", "Lemonade", 2016),
                ("Drunk in Love", "Beyonce", 2013),
                ("Run the World (Girls)", "4", 2011),
                ("Texas Hold 'Em", "Cowboy Carter", 2024),
                ("Cuff It", "Renaissance", 2022),
                ("Sweet Dreams", "I Am... Sasha Fierce", 2008),
                ("Partition", "Beyonce", 2013),
                ("If I Were a Boy", "I Am... Sasha Fierce", 2008),
                ("Sorry", "Lemonade", 2016),
                ("Break My Soul", "Renaissance", 2022)
            ]
        },
        "Rihanna": {
            "genre": "Pop",
            "tracks": [
                ("Umbrella", "Good Girl Gone Bad", 2007),
                ("Diamonds", "Unapologetic", 2012),
                ("We Found Love", "Talk That Talk", 2011),
                ("Stay", "Unapologetic", 2012),
                ("Work", "Anti", 2016),
                ("Don't Stop the Music", "Good Girl Gone Bad", 2007),
                ("Only Girl (In the World)", "Loud", 2010),
                ("Rude Boy", "Rated R", 2009),
                ("Love on the Brain", "Anti", 2016),
                ("Disturbia", "Good Girl Gone Bad: Reloaded", 2008),
                ("What's My Name?", "Loud", 2010),
                ("S&M", "Loud", 2010),
                ("Pon de Replay", "Music of the Sun", 2005),
                ("SOS", "A Girl like Me", 2006),
                ("Take a Bow", "Good Girl Gone Bad: Reloaded", 2008)
            ]
        },
        "Maroon 5": {
            "genre": "Pop",
            "tracks": [
                ("Sugar", "V", 2014),
                ("Girls Like You", "Red Pill Blues", 2017),
                ("She Will Be Loved", "Songs About Jane", 2002),
                ("Moves Like Jagger", "Hands All Over", 2011),
                ("Payphone", "Overexposed", 2012),
                ("Maps", "V", 2014),
                ("Animals", "V", 2014),
                ("Misery", "Hands All Over", 2010),
                ("Sunday Morning", "Songs About Jane", 2002),
                ("This Love", "Songs About Jane", 2002),
                ("One More Night", "Overexposed", 2012),
                ("Cold", "Red Pill Blues", 2017),
                ("What Lovers Do", "Red Pill Blues", 2017),
                ("Memories", "Single", 2019),
                ("Makes Me Wonder", "It Won't Be Soon Before Long", 2007)
            ]
        },
        "Metallica": {
            "genre": "Metal",
            "tracks": [
                ("Enter Sandman", "Metallica (Black Album)", 1991),
                ("Nothing Else Matters", "Metallica (Black Album)", 1991),
                ("One", "...And Justice for All", 1988),
                ("Master of Puppets", "Master of Puppets", 1986),
                ("The Unforgiven", "Metallica (Black Album)", 1991),
                ("Sad but True", "Metallica (Black Album)", 1991),
                ("Fade to Black", "Ride the Lightning", 1984),
                ("For Whom the Bell Tolls", "Ride the Lightning", 1984),
                ("Seek & Destroy", "Kill 'Em All", 1983),
                ("Whiskey in the Jar", "Garage Inc.", 1998),
                ("Creeping Death", "Ride the Lightning", 1984),
                ("Battery", "Master of Puppets", 1986),
                ("Wherever I May Roam", "Metallica (Black Album)", 1991),
                ("The Memory Remains", "Reload", 1997),
                ("Fuel", "Reload", 1997)
            ]
        },
        "Avicii": {
            "genre": "Electronic",
            "tracks": [
                ("Wake Me Up", "True", 2013),
                ("Levels", "Single", 2011),
                ("The Nights", "The Days / Nights EP", 2014),
                ("Hey Brother", "True", 2013),
                ("Waiting for Love", "Stories", 2015),
                ("Without You", "Avici (01)", 2017),
                ("Addicted to You", "True", 2013),
                ("The Days", "The Days / Nights EP", 2014),
                ("I Could Be the One", "Single", 2012),
                ("You Make Me", "True", 2013),
                ("Silhouettes", "Single", 2012),
                ("Broken Arrows", "Stories", 2015),
                ("SOS", "Tim", 2019),
                ("Heaven", "Tim", 2019),
                ("Lonely Together", "Avici (01)", 2017)
            ]
        },
        "Hans Zimmer": {
            "genre": "Soundtrack",
            "tracks": [
                ("Time", "Inception Soundtrack", 2010),
                ("Cornfield Chase", "Interstellar Soundtrack", 2014),
                ("He's a Pirate", "Pirates of the Caribbean Soundtrack", 2003),
                ("Stay", "Interstellar Soundtrack", 2014),
                ("Interstellar Theme", "Interstellar Soundtrack", 2014),
                ("Gladiator Theme", "Gladiator Soundtrack", 2000),
                ("The Dark Knight Suite", "The Dark Knight Soundtrack", 2008),
                ("This Land", "The Lion King Soundtrack", 1994),
                ("Dream Is Collapsing", "Inception Soundtrack", 2010),
                ("Mombasa", "Inception Soundtrack", 2010),
                ("Now We Are Free", "Gladiator Soundtrack", 2000),
                ("Supermarine", "Dunkirk Soundtrack", 2017),
                ("No Time for Caution", "Interstellar Soundtrack", 2014),
                ("Flight", "Man of Steel Soundtrack", 2013),
                ("S.T.A.Y.", "Interstellar Soundtrack", 2014)
            ]
        },
        "Miles Davis": {
            "genre": "Jazz",
            "tracks": [
                ("So What", "Kind of Blue", 1959),
                ("Blue in Green", "Kind of Blue", 1959),
                ("Freddie Freeloader", "Kind of Blue", 1959),
                ("All Blues", "Kind of Blue", 1959),
                ("Flamenco Sketches", "Kind of Blue", 1959),
                ("Milestones", "Milestones", 1958),
                ("Round Midnight", "Round About Midnight", 1957),
                ("My Funny Valentine", "Cookin'", 1957),
                ("Summertime", "Porgy and Bess", 1959),
                ("Autumn Leaves", "Somethin' Else", 1958),
                ("Generique", "Ascenseur pour l'echafaud", 1958),
                ("Stella by Starlight", "58 Miles", 1958),
                ("Seven Steps to Heaven", "Seven Steps to Heaven", 1963),
                ("Bitches Brew", "Bitches Brew", 1970),
                ("TuTu", "Tutu", 1986)
            ]
        },
        "Johnny Cash": {
            "genre": "Country",
            "tracks": [
                ("I Walk the Line", "With His Hot and Blue Guitar", 1956),
                ("Ring of Fire", "Ring of Fire The Best of Johnny Cash", 1963),
                ("Folsom Prison Blues", "With His Hot and Blue Guitar", 1956),
                ("Hurt", "American IV: The Man Comes Around", 2002),
                ("Man in Black", "Man in Black", 1971),
                ("Boy Named Sue", "At San Quentin", 1969),
                ("Get Rhythm", "With His Hot and Blue Guitar", 1956),
                ("Cry! Cry! Cry!", "With His Hot and Blue Guitar", 1955),
                ("Sunday Morning Coming Down", "The Johnny Cash Show", 1970),
                ("Cocaine Blues", "At Folsom Prison", 1968),
                ("God's Gonna Cut You Down", "American V: A Hundred Highways", 2006),
                ("The Man Comes Around", "American IV: The Man Comes Around", 2002),
                ("Jackson", "Carryin' On with Johnny Cash and June Carter", 1967),
                ("Ghost Riders in the Sky", "Silver", 1979),
                ("Give My Love to Rose", "Sings Hank Williams", 1957)
            ]
        },
        "Kanye West": {
            "genre": "Hip-Hop",
            "tracks": [
                ("Stronger", "Graduation", 2007),
                ("Gold Digger", "Late Registration", 2005),
                ("Heartless", "808s & Heartbreak", 2008),
                ("Runaway", "My Beautiful Dark Twisted Fantasy", 2010),
                ("Power", "My Beautiful Dark Twisted Fantasy", 2010),
                ("All of the Lights", "My Beautiful Dark Twisted Fantasy", 2010),
                ("Flashing Lights", "Graduation", 2007),
                ("Bound 2", "Yeezus", 2013),
                ("Can't Tell Me Nothing", "Graduation", 2007),
                ("Father Stretch My Hands Pt. 1", "The Life of Pablo", 2016),
                ("Through the Wire", "The College Dropout", 2004),
                ("Jesus Walks", "The College Dropout", 2004),
                ("Black Skinhead", "Yeezus", 2013),
                ("Ultralight Beam", "The Life of Pablo", 2016),
                ("Carnival", "Vultures 1", 2024)
            ]
        },
        "Kendrick Lamar": {
            "genre": "Hip-Hop",
            "tracks": [
                ("HUMBLE.", "DAMN.", 2017),
                ("DNA.", "DAMN.", 2017),
                ("Alright", "To Pimp a Butterfly", 2015),
                ("Money Trees", "Good Kid, M.A.A.D City", 2012),
                ("Swimming Pools (Drank)", "Good Kid, M.A.A.D City", 2012),
                ("King Kunta", "To Pimp a Butterfly", 2015),
                ("Bitch, Don't Kill My Vibe", "Good Kid, M.A.A.D City", 2012),
                ("Poetic Justice", "Good Kid, M.A.A.D City", 2012),
                ("LOVE.", "DAMN.", 2017),
                ("Not Like Us", "Single", 2024),
                ("m.A.A.d city", "Good Kid, M.A.A.D City", 2012),
                ("The Blacker the Berry", "To Pimp a Butterfly", 2015),
                ("DNA", "DAMN.", 2017),
                ("All The Stars", "Black Panther Soundtrack", 2018),
                ("ELEMENT.", "DAMN.", 2017)
            ]
        },
        "Linkin Park": {
            "genre": "Rock",
            "tracks": [
                ("In the End", "Hybrid Theory", 2000),
                ("Numb", "Meteora", 2003),
                ("Crawling", "Hybrid Theory", 2000),
                ("Faint", "Meteora", 2003),
                ("Breaking the Habit", "Meteora", 2003),
                ("What I've Done", "Minutes to Midnight", 2007),
                ("One Step Closer", "Hybrid Theory", 2000),
                ("Waiting for the End", "A Thousand Suns", 2010),
                ("Burn It Down", "Living Things", 2012),
                ("Castle of Glass", "Living Things", 2012),
                ("Bleed It Out", "Minutes to Midnight", 2007),
                ("Papercut", "Hybrid Theory", 2000),
                ("Somewhere I Belong", "Meteora", 2003),
                ("Shadow of the Day", "Minutes to Midnight", 2007),
                ("Leave Out All the Rest", "Minutes to Midnight", 2007)
            ]
        },
        "Guns N Roses": {
            "genre": "Rock",
            "tracks": [
                ("Sweet Child O' Mine", "Appetite for Destruction", 1987),
                ("Welcome to the Jungle", "Appetite for Destruction", 1987),
                ("Paradise City", "Appetite for Destruction", 1987),
                ("November Rain", "Use Your Illusion I", 1991),
                ("Don't Cry", "Use Your Illusion I", 1991),
                ("Patience", "G N' R Lies", 1988),
                ("Knockin' on Heaven's Door", "Use Your Illusion II", 1991),
                ("Civil War", "Use Your Illusion II", 1991),
                ("Estranged", "Use Your Illusion II", 1991),
                ("Live and Let Die", "Use Your Illusion I", 1991),
                ("Nightrain", "Appetite for Destruction", 1987),
                ("Mr. Brownstone", "Appetite for Destruction", 1987),
                ("You Could Be Mine", "Use Your Illusion II", 1991),
                ("Rocket Queen", "Appetite for Destruction", 1987),
                ("Garden of Eden", "Use Your Illusion I", 1991)
            ]
        },
        "Ed Sheeran": {
            "genre": "Pop",
            "tracks": [
                ("Shape of You", "Divide", 2017),
                ("Perfect", "Divide", 2017),
                ("Thinking Out Loud", "Multiply", 2014),
                ("Bad Habits", "Equals", 2021),
                ("Castle on the Hill", "Divide", 2017),
                ("Photograph", "Multiply", 2014),
                ("Galway Girl", "Divide", 2017),
                ("Happier", "Divide", 2017),
                ("Shivers", "Equals", 2021),
                ("Supermarket Flowers", "Divide", 2017),
                ("The A Team", "Plus", 2011),
                ("Sing", "Multiply", 2014),
                ("Don't", "Multiply", 2014),
                ("Lego House", "Plus", 2011),
                ("Eyes Closed", "Subtract", 2023)
            ]
        },
        "Dua Lipa": {
            "genre": "Pop",
            "tracks": [
                ("Don't Start Now", "Future Nostalgia", 2019),
                ("Levitating", "Future Nostalgia", 2020),
                ("New Rules", "Dua Lipa", 2017),
                ("Physical", "Future Nostalgia", 2020),
                ("Break My Heart", "Future Nostalgia", 2020),
                ("IDGAF", "Dua Lipa", 2017),
                ("One Kiss", "Single", 2018),
                ("Cold Heart (PNAU Remix)", "The Lockdown Sessions", 2021),
                ("Dance The Night", "Barbie Soundtrack", 2023),
                ("Houdini", "Optimism", 2023),
                ("Be the One", "Dua Lipa", 2015),
                ("Blow Your Mind (Mwah)", "Dua Lipa", 2016),
                ("Love Again", "Future Nostalgia", 2020),
                ("Hallucinate", "Future Nostalgia", 2020),
                ("Training Season", "Optimism", 2024)
            ]
        },
        "Bob Marley": {
            "genre": "Reggae",
            "tracks": [
                ("Three Little Birds", "Exodus", 1977),
                ("No Woman, No Cry", "Natty Dread", 1974),
                ("Redemption Song", "Uprising", 1980),
                ("Could You Be Loved", "Uprising", 1980),
                ("One Love / People Get Ready", "Exodus", 1977),
                ("Is This Love", "Kaya", 1978),
                ("Jamming", "Exodus", 1977),
                ("Buffalo Soldier", "Confrontation", 1983),
                ("I Shot the Sheriff", "Burnin'", 1973),
                ("Get Up, Stand Up", "Burnin'", 1973),
                ("Stir It Up", "Catch a Fire", 1973),
                ("Satisfy My Soul", "Kaya", 1978),
                ("Natural Mystic", "Exodus", 1977),
                ("Waiting in Vain", "Exodus", 1977),
                ("Exodus", "Exodus", 1977)
            ]
        }
    }
    
    rows = []
    song_counter = 1
    
    np.random.seed(42)  # For consistent rating stats
    
    for artist, info in artists_data.items():
        genre = info["genre"]
        for title, album, year in info["tracks"]:
            song_id = f"song_{song_counter:04d}"
            
            # Generate realistic ratings metrics
            avg_rating = round(np.random.uniform(4.0, 4.9) if "Yesterday" in title or "Bohemian" in title or "Stairway" in title else np.random.uniform(3.5, 4.7), 1)
            num_ratings = int(np.random.randint(100, 5000) if "Shape" in title or "Blinding" in title or "Billie Jean" in title else np.random.randint(20, 800))
            
            rows.append({
                "songId": song_id,
                "title": title,
                "artist": artist,
                "album": album,
                "year": year,
                "genre": genre,
                "avg_rating": avg_rating,
                "num_ratings": num_ratings
            })
            song_counter += 1
            
    df = pd.DataFrame(rows)
    os.makedirs(DATA_DIR, exist_ok=True)
    csv_path = os.path.join(DATA_DIR, "songs.csv")
    df.to_csv(csv_path, index=False)
    print(f"[OK] Generated {len(df)} tracks inside {csv_path}")
    return df


def train_songs_model():
    """Train the content-based recommendation model using songs.csv."""
    songs_path = os.path.join(DATA_DIR, "songs.csv")
    
    if not os.path.exists(songs_path):
        songs_df = generate_default_dataset()
    else:
        print(f"\n[*] Loading existing songs dataset from {songs_path}...")
        songs_df = pd.read_csv(songs_path)
        
    print(f"  Songs loaded: {songs_df.shape}")
    
    # Preprocessing
    songs_df["year"] = pd.to_numeric(songs_df["year"], errors="coerce").fillna(0).astype(int)
    
    print("[*] Creating tags...")
    
    def build_tags(row):
        """Build tag string: title + artist (spaceless) + album (spaceless) + genre + decade."""
        # Tokenized title
        title_words = str(row["title"]).split()
        
        # Spaceless fields
        artist = [str(row["artist"]).replace(" ", "")]
        album = [str(row["album"]).replace(" ", "")]
        
        # Genre (e.g. "Rock", "Pop")
        genre = [str(row["genre"]).replace(" ", "")]
        
        # Decade grouping
        decade = [get_decade(row["year"])]
        
        all_tags = title_words + artist + album + genre + decade
        return " ".join(all_tags).lower()

    songs_df["tags"] = songs_df.apply(build_tags, axis=1)
    
    # Save the dataframe
    new_df = songs_df[["songId", "title", "artist", "album", "year", "genre", "tags", "avg_rating", "num_ratings"]].copy()
    new_df = new_df.reset_index(drop=True)
    
    print(f"    Final dataframe shape: {new_df.shape}")
    
    # Vectorization
    print("\n[*] Computing CountVectorizer vectors...")
    cv = CountVectorizer(max_features=5000, stop_words="english")
    vectors = cv.fit_transform(new_df["tags"]).toarray()
    
    # Cosine Similarity
    print("[*] Computing cosine similarity matrix...")
    similarity = cosine_similarity(vectors)
    similarity = similarity.astype(np.float16)
    
    print(f"    Similarity matrix shape: {similarity.shape}, Memory: {similarity.nbytes / (1024**2):.3f} MB")
    
    # Save pickle files
    os.makedirs(MODELS_DIR, exist_ok=True)
    songs_pkl_path = os.path.join(MODELS_DIR, "songs.pkl")
    similarity_pkl_path = os.path.join(MODELS_DIR, "songs_similarity.pkl")
    
    pickle.dump(new_df, open(songs_pkl_path, "wb"))
    pickle.dump(similarity, open(similarity_pkl_path, "wb"))
    
    print(f"\n[SAVED] {songs_pkl_path}")
    print(f"[SAVED] {similarity_pkl_path}")
    print(f"\n[OK] Songs model training complete!")
    
    # Quick test
    test_song = "Yesterday"
    try:
        idx = new_df[new_df["title"] == test_song].index[0]
        scores = list(enumerate(similarity[idx]))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)
        
        print(f"\n[TEST] Top 5 similar to '{test_song}':")
        for i in scores[1:6]:
            title = new_df.iloc[i[0]]["title"]
            artist = new_df.iloc[i[0]]["artist"]
            score = round(i[1] * 100, 1)
            print(f"       {title} by {artist} -- {score}% similar")
    except IndexError:
        print(f"\n[TEST] '{test_song}' not found in dataset.")


if __name__ == "__main__":
    train_songs_model()
