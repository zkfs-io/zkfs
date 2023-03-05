
import React from 'react';
import OriginalLayout from '@theme-original/Layout';
import Head from '@docusaurus/Head';

export default function Layout(props) {
  return (
    <>
      <Head>
        <meta name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"></meta>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        <script async defer src="https://buttons.github.io/buttons.js"></script>
      </Head>
      <OriginalLayout {...props} />
    </>
  );
}