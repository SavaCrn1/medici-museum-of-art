/**
 * Single source of truth for everything that appears in more than one place.
 *
 * The old Squarespace site kept hours, phone and email in separate blocks on
 * separate pages, and they drifted apart (the footer said Thursday-Sunday while
 * /visit and /tours said Wednesday-Sunday). Editing this file changes every
 * page at once, so that cannot happen again.
 */

const site = {
  name: 'Medici Museum of Art',
  shortName: 'Medici',
  tagline: 'Free admission. Classic, modern and contemporary art in Warren, Ohio.',
  url: 'https://medicimuseum.art',

  address: {
    street: '9350 East Market St.',
    city: 'Warren',
    state: 'OH',
    zip: '44484',
    country: 'United States',
    // Used for the "Get directions" links. Same query the museum's own event
    // pages already use, so it resolves to the identical map pin.
    mapQuery: '9350 E Market St, Warren, OH 44484',
  },

  phone: {
    display: '(330) 856-2120',
    // E.164 for tel: — works from every device and dialler.
    href: '+13308562120',
  },

  email: {
    // The address visitors see IS the address the link opens. On the old site
    // the text read info@medicimuseum.art but the mailto: went to two named
    // staff inboxes — a WCAG 2.5.3 (Label in Name) failure and a privacy leak.
    display: 'info@medicimuseum.art',
    href: 'info@medicimuseum.art',
  },

  /**
   * Opening hours, machine-readable. `days` uses 0=Sunday .. 6=Saturday.
   * The calendar reads this to mark open days, and the footer/Visit page
   * render the same data, so the site can never contradict itself again.
   *
   * NOTE FOR THE MUSEUM: the old site published two different answers.
   * Wednesday-Sunday is used here because both /visit and /tours said so.
   * Change `days` below if Thursday-Sunday is correct.
   */
  hours: {
    days: [3, 4, 5, 6, 0], // Wed, Thu, Fri, Sat, Sun
    label: 'Wednesday – Sunday',
    time: '11am – 4pm',
    opens: '11:00',
    closes: '16:00',
    note: 'Closed on major holidays',
    admission: 'General admission is free.',
  },

  social: [
    { name: 'Facebook', href: 'https://www.facebook.com/medicimuseumofart/' },
    { name: 'Instagram', href: 'https://www.instagram.com/medicimuseum.art/' },
  ],

  external: {
    eventbrite: 'https://www.medicimuseum.eventbrite.com/',
    volunteerApplication:
      'https://www.medicimuseum.art/s/Volunteer-Application_Medici.pdf',
    rightsAndReproductions:
      'https://www.medicimuseum.art/rights-and-reproductions',
  },

  partners: [
    {
      name: 'American Alliance of Museums',
      href: 'https://www.aam-us.org/',
      logo: 'assets/img/logo-aam.png',
      alt: 'American Alliance of Museums',
    },
    {
      name: 'Ohio Arts Council',
      href: 'https://oac.ohio.gov/',
      logo: 'assets/img/logo-ohio-arts.png',
      alt: 'Ohio Arts Council',
    },
    {
      name: 'Feuerman Sculpture Foundation',
      href: null,
      logo: 'assets/img/logo-feuerman.png',
      alt: 'Feuerman Sculpture Foundation',
    },
  ],
};

/**
 * Navigation. Slugs are deliberately identical to the live Squarespace site so
 * that every existing link, bookmark and search result keeps working.
 *
 * Folders render as real <button> disclosures rather than the old href-less
 * <a> elements, which no keyboard could reach.
 */
const nav = [
  {
    label: 'Connect',
    children: [
      { label: 'About Us', slug: 'about-us-1' },
      { label: 'Visit', slug: 'visit' },
      { label: 'Home', slug: '' },
      { label: 'Rentals', slug: 'rentals' },
      { label: 'Tours', slug: 'tours' },
      { label: 'Volunteer', slug: 'volunteer' },
      { label: 'Contact Us', slug: 'contact-us' },
    ],
  },
  { label: 'Donate', slug: 'donate', cta: true },
  {
    label: 'On View',
    children: [{ label: 'Exhibitions', slug: 'exhibits' }],
  },
  {
    label: 'Inspire',
    children: [
      { label: 'Upcoming Events and Classes', slug: 'upcomingevents' },
      { label: 'Subscribe', slug: 'subscribe' },
    ],
  },
];

module.exports = { site, nav };
