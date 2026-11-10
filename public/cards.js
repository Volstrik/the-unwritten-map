// The Unwritten Map - Curated Mystery, Nature & Romance Card Decks

const GAME_DECKS = {
  // Round 1: The Whispering Grove (Mystery, Nature, Attraction & Curiosity)
  round1: [
    {
      id: 'wg-1',
      title: 'First Mist',
      category: 'Mystery & First Impressions',
      icon: '🌫️',
      question: 'Think back to the moment you first became aware of me. What was the exact first impression that formed in your mind, and how has that perception shifted since?',
      hint: 'Be candid: first impressions are rarely the whole truth, but they always carry a spark.'
    },
    {
      id: 'wg-2',
      title: 'The Forest Frequency',
      category: 'Nature & Atmosphere',
      icon: '🌲',
      question: 'If our current dynamic was a specific time of day and a piece of weather in the wilderness, what would it look like? (e.g., misty dawn before sunrise, sudden summer thunderstorm, starlit campfire in deep autumn?)',
      hint: 'Paint the scenery. How does the air feel between us?'
    },
    {
      id: 'wg-3',
      title: 'The Unspoken Tell',
      category: 'Subtle Attraction',
      icon: '👁️',
      question: 'What is a quiet, subtle thing someone does that you find unexpectedly attractive—something that most people might never notice?',
      hint: 'Not the obvious things. The small mannerisms, a vocal cadence, or a look.'
    },
    {
      id: 'wg-4',
      title: 'Midnight Coordinates',
      category: 'Imagination & Escapism',
      icon: '🌌',
      question: 'Imagine we could disappear tonight with no obligations, no phones, and a vintage car with a full tank of gas. Where would you drive us until dawn?',
      hint: 'Destination matters less than what we talk about on the highway.'
    },
    {
      id: 'wg-5',
      title: 'The Endearing Flaw',
      category: 'Vulnerability & Charm',
      icon: '🌿',
      question: 'What is a quirk or weird habit you have that you secretly hope someone will find endearing rather than annoying?',
      hint: 'The talking stage is the time to uncover the little eccentricities.'
    },
    {
      id: 'wg-6',
      title: 'Echo of the Heart',
      category: 'Emotional Resonance',
      icon: '🕊️',
      question: 'When you are having a difficult day, what kind of affection or comfort actually makes you feel safe: quiet presence, gentle humor, a distraction, or someone just listening?',
      hint: 'How do you let someone in when your guard is up?'
    },
    {
      id: 'wg-7',
      title: 'The Intuitive Pull',
      category: 'Chemistry & Intuition',
      icon: '✨',
      question: 'Do you believe two people can instinctively sense tension or chemistry before they even say anything significant? What was a moment you felt that recently?',
      hint: 'Trust your intuition. Don’t filter.'
    },
    {
      id: 'wg-8',
      title: 'The Secret Sanctuary',
      category: 'Personal Mystery',
      icon: '🗝️',
      question: 'What is a side of your personality that only a rare few people in your life ever get to witness?',
      hint: 'The version that only comes out at 2:00 AM or with someone you completely trust.'
    },
    {
      id: 'wg-9',
      title: 'Firefly Flicker',
      category: 'Playful Flirtation',
      icon: '✨',
      question: 'What was a moment in our conversations so far where your heart skipped a little beat or you found yourself smiling at your screen like an idiot?',
      hint: 'Honesty is the golden rule. No hiding behind jokes.'
    },
    {
      id: 'wg-10',
      title: 'The Ancient Pact',
      category: 'Love & Values',
      icon: '📜',
      question: 'What is something that sounds traditional or old-fashioned in romance that you actually secretly crave?',
      hint: 'Handwritten notes, slow dances in a kitchen, holding coats, courting?'
    },
    {
      id: 'wg-11',
      title: 'Constellation of You',
      category: 'Curiosity',
      icon: '⭐',
      question: 'If you had to pick one thing about me that you are most intensely curious to discover or understand better, what would it be?',
      hint: 'Dig past the surface. What riddle do you want to solve?'
    },
    {
      id: 'wg-12',
      title: 'The Forbidden Question',
      category: 'Tension & Truth',
      icon: '🔥',
      question: 'What is a question you’ve been too hesitant or shy to ask me directly during our talking stage?',
      hint: 'Now is the safe zone. The map protects honest wanderers.'
    },
    {
      id: 'wg-13',
      title: 'Nature’s Silence',
      category: 'Intimacy & Silence',
      icon: '🍃',
      question: 'How comfortable are you with shared silence? What do you think passes between two people when they sit together without speaking?',
      hint: 'Can quiet be romantic or does it make you nervous?'
    },
    {
      id: 'wg-14',
      title: 'The Spark Rule',
      category: 'Philosophy of Love',
      icon: '⚡',
      question: 'Do you believe attraction is an instant lightning strike that happens in 5 seconds, or a slow embers fire that grows as you uncover who they are?',
      hint: 'How does it usually happen for you?'
    },
    {
      id: 'wg-15',
      title: 'The Midnight Playlist',
      category: 'Music & Soul',
      icon: '🎶',
      question: 'If you had to play me ONE song right now that feels like your inner world, what would it be and why?',
      hint: 'Music reveals what words try to conceal.'
    }
  ],

  // Round 2: The Romantic Dare (Elevating the Tension)
  round2: [
    {
      id: 'rd-1',
      title: 'The Ideal First Encounter',
      type: 'dare',
      icon: '🕯️',
      prompt: 'Describe your dream first real-world date with me. Go into vivid detail: the time of evening, the setting, the scent in the air, the soundtrack, and how we say goodbye at the end of the night.',
      requirement: 'Leave no room for generic answers. Make it cinematic.'
    },
    {
      id: 'rd-2',
      title: 'The Unfiltered Compliment',
      type: 'dare',
      icon: '🌹',
      prompt: 'Give me a 100% genuine, unfiltered compliment that you’ve thought about me but haven’t said out loud because it felt too bold or vulnerable.',
      requirement: 'It cannot be just about clothes or generic polite flattery.'
    },
    {
      id: 'rd-3',
      title: 'The Spontaneous Midnight Surprise',
      type: 'dare',
      icon: '🌙',
      prompt: 'Invent a completely spontaneous, slightly mischievous surprise date for us that could only happen between 11:00 PM and 3:00 AM.',
      requirement: 'Think rooftop stargazing, trespassing on a scenic hill, midnight diner run.'
    },
    {
      id: 'rd-4',
      title: 'The Camera Roll Mystery',
      type: 'dare',
      icon: '📷',
      prompt: 'Check the 5th photo or screenshot in your camera roll right now. Describe what it is honestly, and reveal the unspoken story or feeling behind that photo.',
      requirement: 'No cheating or skipping back to an aesthetic one.'
    },
    {
      id: 'rd-5',
      title: 'Whisper of the Forest',
      type: 'dare',
      icon: '🎙️',
      prompt: 'If we were sitting close together in the dim light of an evening fire right now, what is one thing you would want to lean in and whisper to me?',
      requirement: 'Keep the tension high. Type it or say it aloud if on a call.'
    },
    {
      id: 'rd-6',
      title: 'The Name Spell',
      type: 'dare',
      icon: '✨',
      prompt: 'Say (or type) my name, followed by the exact feeling or memory that comes to your mind when you think of it.',
      requirement: 'Names carry power. How does mine sound in your thoughts?'
    },
    {
      id: 'rd-7',
      title: 'The Secret Soft Spot',
      type: 'dare',
      icon: '🐾',
      prompt: 'Confess the quickest way someone can completely disarm you and make you turn into a soft, affectionate version of yourself.',
      requirement: 'Give up the cheat code to your heart.'
    },
    {
      id: 'rd-8',
      title: 'The Eye Contact Challenge',
      type: 'dare',
      icon: '👀',
      prompt: 'If we were face-to-face right now, how long do you think you could look directly into my eyes without looking away, laughing, or blushing?',
      requirement: 'Who breaks first? Describe what happens in your head during intense eye contact.'
    }
  ],

  // Round 3: Predict Our Future (Intuitive Guesses & Chemistry Test)
  round3: [
    {
      id: 'pf-1',
      text: 'You fall for someone harder and deeper than you ever let on to your friends or the outside world.',
      category: 'Emotional Depths'
    },
    {
      id: 'pf-2',
      text: 'If we took a spontaneous road trip, you would be the one in charge of the snacks and navigation, while secretly wishing we’d get pleasantly lost.',
      category: 'Adventure Dynamic'
    },
    {
      id: 'pf-3',
      text: 'When you really like someone, you replay conversations in your mind and overanalyze the cute moments when you are trying to fall asleep.',
      category: 'Talking Stage Tendencies'
    },
    {
      id: 'pf-4',
      text: 'Your ideal love language isn’t grand expensive gestures—it’s someone noticing you were quiet and bringing you your favorite drink without asking.',
      category: 'Inner Needs'
    },
    {
      id: 'pf-5',
      text: 'Beneath your composed exterior, you have a playful, sarcastic streak that only comes alive when you feel completely safe with someone.',
      category: 'Personality Secret'
    },
    {
      id: 'pf-6',
      text: 'On our first real date, you will pretend not to be nervous, but your hands or laugh will give you away within the first ten minutes.',
      category: 'First Date Destiny'
    },
    {
      id: 'pf-7',
      text: 'In five years, you will look back on this season of your life as the turning point where everything became much more magical.',
      category: 'Destiny & Tomorrow'
    },
    {
      id: 'pf-8',
      text: 'You secretly want someone who doesn’t let you get away with your walls and gently calls you out when you’re hiding your feelings.',
      category: 'Romantic Truth'
    }
  ],

  // Round 4: The Almost Confession
  round4: {
    title: 'The Almost Confession',
    promptTemplate: 'Something about you that I’ve been wanting to tell you is...',
    explanation: 'Both travelers write in secret. Neither confession is revealed until both envelopes are sealed in the moonlight. When the seals break, both truths shine at once.',
    placeholder: 'Write the truth here. Don’t hold back now—you’ve walked this far through the mist...'
  },

  // Archetypes for the Final Chamber
  archetypes: [
    {
      title: 'The Celestial Alchemists',
      tagline: 'Deep Magnetic Resonance & Electric Tension',
      description: 'Your connection isn’t just small talk; it’s an effortless gravitational pull. You share a rare mix of quiet depth, mutual intrigue, and an unspoken understanding that neither of you is quite ready to admit out loud yet.',
      verdict: 'Chemistry: Dangerous · Probability of Catching Feelings: 98% · The rule was: whoever falls first doesn’t lose. You might both be winning.',
      nextStep: 'Invite them on a twilight or late-night walk where you can talk without the distraction of daylight.'
    },
    {
      title: 'The Twilight Adventurers',
      tagline: 'Playful Banter, Wild Sparks & Uncontainable Laughter',
      description: 'You tease, you spark, and you balance on the delicious edge between best friends and undeniable romantic tension. The humor is sharp, the timing is natural, and every exchange leaves both of you checking your phone with a smile.',
      verdict: 'Chemistry: Electric · Banter Compatibility: 99% · The sparks are already flying.',
      nextStep: 'Plan a competitive or spontaneous first date—mini golf, an arcade, or a lively street-food hunt.'
    },
    {
      title: 'The Moonlit Slow-Burns',
      tagline: 'Mysterious Depth, Sweet Vulnerability & Warm Embers',
      description: 'Neither of you gives away your heart lightly, which makes every shared secret and blush twice as valuable. There is a patient, tender fire building here that promises to outlast any quick rush.',
      verdict: 'Chemistry: Enduring · Resonance: Soulful · The foundation you are building is remarkably genuine.',
      nextStep: 'Find a cozy, intimate spot—a candlelit coffee corner or a quiet park bench under ancient trees.'
    }
  ]
};

if (typeof window !== 'undefined') {
  window.GAME_DECKS = GAME_DECKS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GAME_DECKS;
}
