import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export default function HomepageFeatures() {
  return (
    <div className='container'>
      <div className={styles.jumbo}>

        <div className={styles.headline}>
          <div className={styles.logo}>
            <h1>ZKFS</h1>
            <span>early technical preview</span>
          </div>
          <p className={styles.description}>ZKFS (Zero-Knowledge File System) is a file system protocol for the zero-knowledge world. Based on SnarkyJS, it supports the Mina blockchain as a first-class citizen.</p>
        </div>

        <div className={styles.preview}>
          <iframe
            className={styles.iframe}
            src="https://stackblitz.com/github/zkfs-io/zkfs?embed=1&file=packages/examples/test/counter.test.ts,packages/examples/test/counter.ts&hideExplorer=1&hideNavigation=1&theme=dark&view=editor"
            frameborder="0"
          ></iframe>
        </div>


        <div className={styles.buttons}>
          <a className={`${styles.button} ${styles.primaryButton}`} href="/docs/canary/intro">Documentation (soon)</a>
          <a className={`${styles.button} ${styles.ghostButton}`} href="https://stackblitz.com/github/zkfs-io/zkfs?file=packages/examples/test/counter.test.ts,packages/examples/test/counter.ts&hideExplorer=1&hideNavigation=1&theme=dark&view=editor">
            Try Online
            <svg width="13.5" height="13.5" aria-hidden="true" viewBox="0 0 24 24" class="iconExternalLink_node_modules-@docusaurus-theme-classic-lib-theme-Icon-ExternalLink-styles-module"><path fill="currentColor" d="M21 13v10h-21v-19h12v2h-10v15h17v-8h2zm3-12h-10.988l4.035 4-6.977 7.07 2.828 2.828 6.977-7.07 4.125 4.172v-11z"></path></svg>
          </a>
        </div>

      </div>
    </div>
  );
}
