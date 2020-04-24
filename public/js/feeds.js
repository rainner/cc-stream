/**
 * Placeholder:
 * list of tabs and related sources.
 * simulated json string data passed from php.
 */
var feeds_data = `[
  {
    "name": "All",
    "icon": "",
    "urls": []
  },
  {
    "name": "News",
    "icon": "fa fa-rss",
    "urls": [ "https://cointelegraph.com/rss" ]
  },
  {
    "name": "Blog",
    "icon": "fa fa-align-left",
    "urls": [ "https://blog.kraken.com/post/category/kraken-news/feed/" ]
  },
  {
    "name": "Reddit",
    "icon": "fab fa-reddit",
    "urls": [ "https://reddit.com/r/CryptoMarkets.rss" ]
  },
  {
    "name": "Youtube",
    "icon": "fab fa-youtube",
    "urls": [ "https://youtube.com/feeds/videos.xml?channel_id=UCBcRF18a7Qf58cCRy5xuWwQ" ]
  },
  {
    "name": "Twitter",
    "icon": "fab fa-twitter",
    "urls": [ "https://coinrated.com/templates/cr/tweet/userjson.php?user=Coinbase" ]
  },
  {
    "name": "Github",
    "icon": "fab fa-github",
    "urls": [ "https://github.com/Samourai-Wallet/samourai-wallet-android/releases.atom" ]
  },
  {
    "name": "Medium",
    "icon": "fab fa-medium",
    "urls": [ "https://medium.com/feed/@VitalikButerin" ]
  }
]`;

/**
 * Vue feeds app instance
 */
new Vue({
  el: '#news-feed',

  // app data
  data: {
    // tabs
    tab: 'all',
    tabs: [],

    // entries
    entries: [],
    errors: [],
    search: '',

    // pagination
    total: 0,
    listed: 0,
    limit: 30,
    showall: false,

    // cors proxy
    // proxy: 'http://localhost:8080/',
    proxy: 'https://cors-anywhere.herokuapp.com/',

    // time stuff
    time_fetch: ( 60 * 5 ), // refetch on a timer (seconds)
    time_new: ( 60 * 60 * 24 ), // time to show entries as new (seconds)
    time_init: 0, // user initial timestamp (seconds)
  },

  // computed methods
  computed: {

    // tabs list with new counts
    tabsList() {
      let list  = this.tabs.slice();

      list.forEach( tab => {
        if ( tab.type === 'all' ) {
          tab.newcount = this.entries.filter( e => e.isnew ).length;
        } else {
          tab.newcount = this.entries.filter( e => ( e.type === tab.type && e.isnew ) ).length;
        }
      });
      return list;
    },

    // filter feeds list
    feedsList() {
      let list = this.entries.slice();

      // filter list based on search term
      if ( this.search.length > 1 ) {
        const regxp = new RegExp( '('+ this.search +')', 'i' );
        list = list.filter( e => regxp.test( e.title ) );
      }
      // filter list based on active tab
      if ( this.tab !== 'all' ) {
        list = list.filter( e => ( e.type === this.tab ) );
      }
      // sort list based on timestamp
      list = this.$utils.sort( list, 'timestamp', 'desc' );
      this.total  = list.length;
      this.listed = list.length;

      // trim list if needed
      if ( !this.showall && this.limit && this.total > this.limit ) {
        list = list.slice( 0, this.limit );
        this.listed = list.length;
      }
      return list;
    },

    // check if there are more entries to show
    hasMoreEntries() {
      return ( this.total > this.listed );
    },
  },

  // custom methods
  methods: {

    // store initial user timestamp
    updateUserTime() {
      const date = new Date();
      this.time_init = ( date.getTime() / 1000 );
    },

    // setup tabs and feed urls
    setupTabs() {
      if ( !window.feeds_data ) return;
      try {
        const tabs = JSON.parse( window.feeds_data );
        for ( let tab of tabs ) this.addTab( tab );
      }
      catch ( e ) {
        console.warn( 'setupTabsJsonError:', e.message || 'Could not parse JSON string from server.' );
      }
    },

    // switch to new tab and clear new entries after a few seconds
    switchTab( type ) {
      this.showall = false;
      this.tab = type;
    },

    // add new feeds tab
    addTab( data ) {
      if ( typeof data !== 'object' || !data.name || !data.urls ) return;
      if ( !Array.isArray( data.urls ) ) return;

      // common tab properties
      const type = this.$utils.uniq( data.name );
      const name = 'Tab';
      const icon = 'fa fa-rss';
      const urls = [];

      // add new tab to list
      const e = { type, name, icon, urls };
      this.tabs.push( Object.assign( e, data ) );
    },

    // add new feed entry to the list
    addEntry( data ) {
      if ( typeof data !== 'object' || !data.title || !data.link ) return;

      // check if entry already exists
      const uniq   = this.$utils.uniq( data.title );
      const exists = this.entries.filter( e => ( e.uniq === uniq ) ).length;
      if ( exists ) return;

      // build and parse entry date info
      const _n = Date.now();
      const _d = new Date( data.date || _n );
      const _p = this.$utils.parseTime( _d );

      // logic to detect if an entry is new
      const timestamp = ( _d.getTime() / 1000 ); // entry timestamp (seconds)
      const elapsed   = ( _n / 1000 ) - timestamp; // age of entry (seconds)
      const isnew     = ( timestamp > this.time_init && elapsed < this.time_new );
      const datestr   = [ _p.day, _p.month, _p.year ].join( ' ' );

      // other common entry properties
      const type   = 'all';
      const tag    = '';
      const icon   = 'fa fa-rss';
      const title  = 'Empty title';
      const link   = '';
      const author = '';

      // add new entry to list
      const e = { uniq, timestamp, elapsed, datestr, isnew, type, tag, icon, title, link, author };
      const entry = this.resolveEntryTag( Object.assign( e, data ) );
      this.entries.push( entry );
    },

    // turn off new flag on entries
    resetEntries( type ) {
      this.entries.forEach( e => {
        if ( type && e.type !== type ) return;
        e.isnew = false;
      });
    },

    // resolve unique entry tag for specific entry types
    resolveEntryTag( data ) {
      const _r = new URL( data.link );
      const pathlist = String( _r.pathname || '' ).replace( /^\/+|\/+$/g, '' ).split( '/' );
      const pathname = pathlist.length ? pathlist.shift() : '';
      const hostname = String( _r.hostname || '' );

      // news/blog: use link hostname
      if ( data.type === 'news' || data.type === 'blog' ) {
        data.tag = hostname;
      }
      // twitter/medium: use pathname handle
      if ( data.type === 'twitter' || data.type === 'medium' ) {
        data.tag = `@${pathname}`;
      }
      // github: use path name as repo name
      if ( data.type === 'github' ) {
        const repo = pathlist.length ? pathlist.shift() : '';
        data.title = `${repo} - ${data.title}`;
        data.tag = 'Release';
      }
      // reddit: use pathname without extension
      if ( data.type === 'reddit' ) {
        const _x = new URL( data.urls[0] );
        data.tag = String( _x.pathname || '' ).replace( /(\.[\w\-]+)$/, '' );
      }
      // youtube: author name from feed entries
      if ( data.type === 'youtube' ) {
        data.tag = data.author;
      }
      return data;
    },

    // helper to open a new page for a link
    openUrl( link ) {
      window.open( link, '_blank' );
    },

    // parse rss string data from response (atom/rss)
    // https://en.wikipedia.org/wiki/Atom_(Web_standard)
    // https://en.wikipedia.org/wiki/RSS
    parseRss( tab, data ) {
      const _parser  = new DOMParser();
      const _dom     = _parser.parseFromString( data || '', 'text/xml' );
      const _items   = _dom.querySelectorAll( 'item' ); // rss
      const _entries = _dom.querySelectorAll( 'entry' ); // atom

      // resolve final list
      let _list = [];
      _list = _items.length   ? _items   : _list;
      _list = _entries.length ? _entries : _list;

      // parsing error
      if ( _dom.documentElement.nodeName === 'parsererror' ) {
        return this.handleError( tab, `Could not parse the response` );
      }
      // empty feed error
      if ( !_list.length ) {
        return this.handleError( tab, `The feed has no items` );
      }
      // loop list items
      _list.forEach( el => {
        // look for entry title (atom/rss)
        let title = el.querySelector( 'title' );
        title = title ? title.textContent : '';
        // look for entry link (atom/rss)
        let link = el.querySelector( 'link' );
        link = link ? link.getAttribute( 'href' ) || link.textContent : '';
        // look for entry pubDate (rss)
        let pubDate = el.querySelector( 'pubDate' );
        pubDate = pubDate ? pubDate.textContent : '';
        // look for entry updated (atom)
        let updated = el.querySelector( 'updated' );
        updated = updated ? updated.textContent : '';
        // look for author updated (atom)
        let author = el.querySelector( 'author > name' );
        author = author ? author.textContent : '';
        // add entry to list
        let date = pubDate || updated || '';
        this.addEntry( Object.assign( { title, link, date, author }, tab ) );
      });
    },

    // parse twitter json
    // https://coinrated.com/templates/cr/tweet/userjson.php?user={handle}
    parseTwitter( tab, data ) {
      let _list = ( Array.isArray( data ) ) ? data : [];

      // parse json string response
      if ( typeof data === 'string' ) {
        try { _list = JSON.parse( data ); }
        catch ( e ) { return this.handleError( tab, e.message || `Could not parse the response` ); }
      }
      // empty feed error
      if ( !_list.length ) {
        return this.handleError( tab, `The feed has no items` );
      }
      // loop list items
      _list.forEach( e => {
        let id    = e.id_str || '';
        let user  = e.user.name || '';
        let title = e.full_text || '';
        let link  = 'https://twitter.com/'+ user +'/status/'+ id;
        let date  = e.created_at || '';
        this.addEntry( Object.assign( { title, link, date }, tab ) );
      });
    },

    // fetch remote rss for all sources
    fetchSources() {
      this.errors = [];
      // loop tabs
      for ( let tab of this.tabs ) {
        // loop urls or each tab
        for ( let url of tab.urls ) {
          // make request for each url this tab has
          axios( { method: 'GET', url: `${this.proxy}${url}` } ).then( res => {
            // check response
            if ( !res || !res.status || !res.data ) return this.handleError( tab, `Could not send the request` );
            if ( res.status >= 400 ) return this.handleError( tab, `Server responded with status ${res.status}` );
            // different parsers based on type
            switch ( tab.type ) {
              case 'twitter' : return this.parseTwitter( tab, res.data );
              default        : return this.parseRss( tab, res.data );
            }
          })
          .catch( e => {
            const error = e.message || `The request has failed`;
            this.handleError( tab, error );
          });
        }
      }
      // setup auto re-fetch
      if ( this.time_fetch >= 60 ) {
        setTimeout( this.fetchSources, 1000 * this.time_fetch );
        // this.updateUserTime(); // only show new entries since last page load
      }
    },

    // handle commone request errors
    handleError( tab, error ) {
      const msg = `${tab.type}Error: ${error}.`;
      this.errors.push( msg );
      console.warn( msg );
    },
  },

  // app maunted
  mounted() {
    this.setupTabs();
    this.fetchSources();
  },

});
