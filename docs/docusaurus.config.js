// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'ZKFS',
  tagline: 'Zero-knowledge distributed file system',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://zkfs.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'zkfs-io', // Usually your GitHub org/user name.
  projectName: 'zkfs', // Usually your repo name.

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          versions: {
            current: {
              label: 'Canary 🚧',
              path: 'canary',
            },
          },
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        blog: {
          showReadingTime: true,

          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      announcementBar: {
        id: 'proposal_live',
        content: `Do you like ❤️ ZKFS? We need your support for our <a href="https://zkignite.minaprotocol.com/zkignite/dev4dev-track-1/phase1-draftproposals/suggestion/346" target="_blank">zkIgnite funding proposal!</a> (live now!)`,
        backgroundColor: 'rgba(81, 232, 131, 0.9)',
        isCloseable: false,

      },
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      // Replace with your project's social card
      image: 'img/zkfs-social-card.jpg',
      navbar: {

        // title: 'My Site',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Documentation (soon)',
          },
          /* A link to the blog. */
          { to: '/blog', label: 'Blog', position: 'left' },
          {
            href: 'https://github.com/zkfs-io/zkfs/tree/develop/packages/examples/test',
            label: 'Examples',
          },
          {
            href: 'https://stackblitz.com/github/zkfs-io/zkfs?file=packages/examples/test/counter.test.ts,packages/examples/test/counter.ts&hideExplorer=1&hideNavigation=1&theme=dark&view=editor',
            label: 'Try online',
          },
          {
            href: 'https://twitter.com/zkfs_io',
            label: 'Twitter',
            position: 'right',
          },
          {
            href: 'https://github.com/zkfs-io/zkfs',
            label: 'GitHub',
            position: 'right',
          },
          {
            type: 'docsVersionDropdown',
            position: 'right',
            dropdownItemsAfter: [{ to: ' ', label: 'No additional versions', }],
            dropdownActiveClassDisabled: true,
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Sitemap',
            items: [
              /* A link to the documentation. */
              // {
              //   label: 'Documentation',
              //   to: '/docs',                
              // },
              {
                label: 'Blog',
                to: '/blog',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/pdKS7px98G',
              },
              {
                label: 'Twitter',
                href: 'http://twitter.com/zkfs_io',
              },
            ],
          },
          {
            title: 'Engineering',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/zkfs-io/zkfs',
              },
              {
                label: 'NPM Packages',
                href: 'https://www.npmjs.com/search?q=%40zkfs',
              },
              {
                label: 'Continuous delivery',
                href: 'https://github.com/zkfs-io/zkfs/actions/workflows/release-develop.yml',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} <a href="https://stove-labs.com/" target="blank">Stove Labs</a>`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
