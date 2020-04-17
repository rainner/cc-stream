/**
 * Placeholders: these come from PHP
 */
var blog_feed = 'https://blog.kraken.com/post/category/kraken-news/feed/';
var news_rss = 'https://cointelegraph.com/rss';
// var twitter_handle = '';
// var medium_handle = 'coindesk';
var reddit_sub = 'CryptoMarkets';
// var youtube_channel = '';

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
    limit: 20,
    // cors proxy
    // proxy: 'http://localhost:8080/',
    proxy: 'https://cors-anywhere.herokuapp.com/',
    // time stuff
    time_fetch: 0, // refetch on a timer (seconds)
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
      return list;
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
      this.addTab( 'all', 'All', '' );

      if ( window.blog_feed ) {
        this.addTab( 'blog', 'Posts', blog_feed );
      }
      if ( window.news_rss ) {
        this.addTab( 'news', 'News', news_rss );
      }
      if ( window.twitter_handle ) {
        this.addTab( 'twitter', 'Twitter', 'https://twitter.com/' + twitter_handle );
      }
      if ( window.reddit_sub ) {
        this.addTab( 'reddit', 'Reddit', 'https://www.reddit.com/r/' + reddit_sub + '.rss' );
      }
      if ( window.medium_handle ) {
        this.addTab( 'medium', 'Medium', 'https://medium.com/feed/@' + medium_handle );
      }
      if ( window.youtube_channel ) {
        this.addTab( 'youtube', 'Youtube', 'https://youtube.com/' + youtube_channel );
      }
    },

    // switch to new tab and clear new entries after a few seconds
    switchTab( type ) {
      this.tab = type;
    },

    // add new feeds tab
    addTab( type, name, url ) {
      if ( !type || !name ) return;
      this.tabs.push( { type, name, url } );
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

      // add new entry to list
      const e = { uniq, timestamp, elapsed, datestr, isnew, type: '', title: '', link: '' };
      this.entries.push( Object.assign( e, data ) );
    },

    // turn off new flag on entries
    resetEntries( type ) {
      this.entries.forEach( e => {
        if ( type && e.type !== type ) return;
        e.isnew = false;
      });
    },

    // trim number of entries for all types
    trimEntries() {
      if ( !this.limit ) return;
      let tpm = [];
      let lst = [];

      for ( let tab of this.tabs ) {
        lst = this.entries.filter( e => ( e.type === tab.type ) ); // filter by type
        lst = this.$utils.sort( lst, 'timestamp', 'desc' ); // sort by timestamp
        if ( lst.length > this.limit ) lst = lst.slice( 0, this.limit ); // remove old entries
        lst.forEach( e => { tpm.push( e ) }); // add to new list
      }
      this.entries = tpm;
    },

    // resolve a icon for a feed based off type
    feedIcon( type ) {
      switch ( type ) {
        case 'blog':     return 'fa fa-align-left';
        case 'news':     return 'fa fa-rss';
        case 'twitter':  return 'fab fa-twitter';
        case 'medium':   return 'fab fa-medium';
        case 'reddit':   return 'fab fa-reddit';
        case 'youtube':  return 'fab fa-youtube';
        default:         return 'fa fa-link';
      }
    },

    // helper to open a new page for a link
    openUrl( link ) {
      window.open( link, '_blank' );
    },

    // parse rss string data from response (atom/rss)
    // https://en.wikipedia.org/wiki/Atom_(Web_standard)
    // https://en.wikipedia.org/wiki/RSS
    parseRss( type, url, data ) {
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
          return this.handleError( type, url, `Could not parse the response` );
        }
        // empty feed error
        if ( !_list.length ) {
          return this.handleError( type, url, `The feed has no items` );
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
          // add entry to list
          let date = pubDate || updated || '';
          this.addEntry( { type, title, link, date } );
        });
        // trim list
        this.trimEntries();
    },

    // fetch remote rss for all sources
    fetchSources() {
      this.errors = [];

      // get feed info from tabs
      for ( let tab of this.tabs ) {
        const { type, url } = tab;
        const request = { method: 'GET', responseType: 'text', url: this.proxy + url };
        if ( !tab.url || typeof tab.url !== 'string' ) continue;

        // make request
        axios( request ).then( res => {
          if ( !res || !res.status || !res.data ) return this.handleError( type, url, `Could not send the request` );
          if ( res.status >= 400 ) return this.handleError( type, url, `Server responded with status ${res.status}` );
          this.parseRss( type, url, res.data );
        })
        .catch( err => {
          this.handleError( type, url, err.message || `The request has failed` );
        });
      }
      // setup auto re-fetch
      if ( this.time_fetch >= 60 ) {
        setTimeout( this.fetchSources, 1000 * this.time_fetch );
      }
    },

    // handle commone request errors
    handleError( type, url, error ) {
      const emsg = `${type}FeedError: ${error} (URL: ${url})`;
      this.errors.push( emsg );
      console.warn( emsg );
    },
  },

  // app maunted
  mounted() {
    // this.updateUserTime();
    this.setupTabs();
    this.fetchSources();
  },

});
