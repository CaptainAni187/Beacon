"""Deterministic demo data for local development seeding."""

SEED_USERS = [
    {
        "username": "maya",
        "email": "maya@beacon.example.com",
        "display_name": "Maya Rao",
        "avatar_url": "/avatars/avatar-1.svg",
        "status": "online",
        "last_seen_minutes": 2,
    },
    {
        "username": "leo",
        "email": "leo@beacon.example.com",
        "display_name": "Leo Martinez",
        "avatar_url": "/avatars/avatar-2.svg",
        "status": "away",
        "last_seen_minutes": 24,
    },
    {
        "username": "nina",
        "email": "nina@beacon.example.com",
        "display_name": "Nina Patel",
        "avatar_url": "/avatars/avatar-3.svg",
        "status": "offline",
        "last_seen_minutes": 360,
    },
    {
        "username": "owen",
        "email": "owen@beacon.example.com",
        "display_name": "Owen Brooks",
        "avatar_url": "/avatars/avatar-4.svg",
        "status": "busy",
        "last_seen_minutes": 52,
    },
    {
        "username": "sana",
        "email": "sana@beacon.example.com",
        "display_name": "Sana Kim",
        "avatar_url": "/avatars/avatar-5.svg",
        "status": "online",
        "last_seen_minutes": 5,
    },
    {
        "username": "theo",
        "email": "theo@beacon.example.com",
        "display_name": "Theo Wilson",
        "avatar_url": "/avatars/avatar-6.svg",
        "status": "offline",
        "last_seen_minutes": 1440,
    },
]

SEED_CONTACTS = [
    ("maya", "leo"),
    ("maya", "nina"),
    ("maya", "sana"),
    ("leo", "owen"),
    ("leo", "theo"),
    ("nina", "sana"),
    ("owen", "theo"),
    ("sana", "theo"),
]

SEED_CONVERSATIONS = [
    {"key": "direct-maya-leo", "type": "direct", "members": ["maya", "leo"]},
    {"key": "direct-maya-nina", "type": "direct", "members": ["maya", "nina"]},
    {"key": "direct-sana-theo", "type": "direct", "members": ["sana", "theo"]},
    {
        "key": "group-product-pulse",
        "type": "group",
        "name": "Product Pulse",
        "avatar_url": "/avatars/avatar-5.svg",
        "members": ["maya", "leo", "nina", "owen"],
    },
    {
        "key": "group-weekend-plans",
        "type": "group",
        "name": "Weekend Plans",
        "avatar_url": "/avatars/avatar-6.svg",
        "members": ["maya", "sana", "theo"],
    },
]

MESSAGE_TOPICS = [
    "Morning! I pushed the notes into the shared doc.",
    "Nice, I will review them after standup.",
    "Can you check the timeline on the launch checklist?",
    "The copy pass is done. It reads much more naturally now.",
    "I added two screenshots and a short Loom link.",
    "Perfect. The edge case around empty states is covered too.",
    "Let us keep the first release focused and tidy.",
    "Agreed. The smaller scope makes the demo much stronger.",
    "Do you want me to handle the follow-up email?",
    "Yes please. Keep it warm and concise.",
    "The latest build is looking stable on my machine.",
    "Same here. I only saw one flaky animation.",
    "I can file that separately so it does not block this pass.",
    "Great call. We can polish it in the next round.",
    "Lunch after the review?",
    "Absolutely, I need a reset after this morning.",
]
