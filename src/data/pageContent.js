// All the words/links/images that show up inside the sign popups live here,
// separate from the popup's rendering logic, so you can edit your bio,
// projects, and contact info without touching SignPopup.jsx at all.
//
// `accent` picks which color theme (defined in SignPopup.css) the popup
// card uses: "lavender" | "pink" | "teal".

export const pageContent = {
  about: {
    icon: "🪴",
    title: "About Me",
    accent: "lavender",
    photo: "/images/me.png", 
    bio: [
      "Hey, I'm Tushar 👋 — welcome to my little corner of the internet, built as a 3D room instead of a boring scroll page.",
      "I'm a developer who likes making things that feel alive: playful interactions, tiny details, and interfaces that reward curiosity.",
    ],
    skills: ["React", "Three.js", "JavaScript", "Blender","Python","Pandas","SQL", "Node.js", "UI/UX"],
  },

 mywork: {
  icon: "💻",
  title: "My Work",
  accent: "pink",
  projects: [
    {
      title: "Full Portfolio Website",
      description:
        "A full scroll-based portfolio site — similar spirit to this 3D room, with sections, interactions, and a lot of small details polished end to end.",
      tags: ["React", "Scroll Interface", "UI/UX"],
      image: "/projects/full_portfolio.png",
      liveUrl: "#",
      codeUrl: "#",
    },
    {
      title: "E-Commerce Website",
      description:
        "A concept e-commerce storefront focused on clean product browsing and a smooth checkout flow.",
      tags: ["React", "E-Commerce", "UI/UX"],
      image: "/projects/e commerse website.png",
      liveUrl: "#",
      codeUrl: "#",
    },
    {
      title: "Donut",
      description:
        "My very first Blender project — a classic procedural donut, made while learning the basics of 3D modeling, shading, and lighting.",
      tags: ["Blender", "3D Modeling"],
      image: "/projects/donut.png",
    },
    {
      title: "Lightning Donut",
      description:
        "A stylized take on the donut scene, reworked with dramatic lighting and material tweaks.",
      tags: ["Blender", "3D Modeling", "Lighting"],
      image: "/projects/lightning donut.png",
    },
    {
      title: "Lightning Sword",
      description:
        "A 3D sword model with an electrified, glowing effect — exploring emission shaders and dynamic lighting in Blender.",
      tags: ["Blender", "3D Modeling", "Lighting"],
      image: "/projects/lightning Sword.png",
    },
  ],
},

  contact: {
    icon: "📮",
    title: "Get In Touch",
    accent: "teal",
    email: "Tusharwaha@gmail.com",
    message: "Got a project, a job idea, or just want to say hi? My inbox (and this mug of coffee) are always open.",
    socials: [
      { label: "GitHub", url: "https://github.com/tushar-kushwaha", icon: "🐙" },
      { label: "LinkedIn", url: "https://linkedin.com/in/tushar-kushwaha-263256435", icon: "💼" },
      { label: "Twitter / X", url: "https://twitter.com/3fiberjs", icon: "🐦" },
      { label: "Instagram", url: "https://instagram.com/tushar_k.verse", icon: "📸" },
    ],
  },
};