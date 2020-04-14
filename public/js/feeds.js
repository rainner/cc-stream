/**
 * Placeholders: these come from PHP
 */
var blog_feed = 'https://blog.kraken.com/post/category/kraken-news/feed/';
var news_rss = 'https://cointelegraph.com/rss';
// var twitter_handle = '';
var medium_handle = 'coindesk';
var reddit_sub = 'CoinBase';
// var youtube_channel = '';

/**
 * Vue feeds app instance
 */
new Vue({
  el: '#news-feed',

  // app data
  data: {
    tab: 'all',
    tabs: [],
    entries: [],
    errors: [],
    search: '',
    proxy: 'https://cors-anywhere.herokuapp.com/',
  },

  // computed methods
  computed: {

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

    // switch to new tab
    switchTab( type ) {
      this.tab = type;
    },

    // add new feeds tab
    addTab( type, name ) {
      if ( !type || !name ) return;
      this.tabs.push( { type, name } );
    },

    // add new feed entry to the list
    addEntry( data ) {
      if ( data === null || typeof data !== 'object' || !data.title ) return;
      const _d = ( typeof data.date === 'string' ) ? new Date( data.date ) : Date.now();
      const _p = this.$utils.parseTime( _d );
      const timestamp = _d.getTime(); // timestamp used to sort by latest
      const datestr   = [ _p.day, _p.month, _p.year ].join( ' ' ); // custom date format
      const uniq      = this.$utils.uniq( data.title ); // uniq slug based off title
      const type      = String( data.type || '' ) || 'all'; // type of feed (twitter, blog, news, etc)
      const proto     = { timestamp, datestr, uniq, type, title: '', link: '' }; // every entry should contain these
      this.entries.push( Object.assign( proto, data ) ); // add to list
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

    // method for fetching and parsing remote rss feed
    // support for both atom and rss formats
    // https://en.wikipedia.org/wiki/Atom_(Web_standard)
    // https://en.wikipedia.org/wiki/RSS
    fetchRss( type, url ) {
      axios( { method: 'GET', responseType: 'text', url: this.proxy + url } ).then( res => {

        // request error
        if ( !res || !res.status || !res.data ) {
          return this.handleError( type, url, `Could not send the request` );
        }

        // response error
        if ( res.status >= 400 ) {
          return this.handleError( type, url, `Server responded with status code ${res.status}` );
        }

        // try to parse response
        const _parser   = new DOMParser();
        const _dom      = _parser.parseFromString( res.data, 'text/xml' );
        const _items    = _dom.querySelectorAll( 'item' ); // rss
        const _entries  = _dom.querySelectorAll( 'entry' ); // atom

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

          // look for entry final date
          let date = pubDate || updated || '';

          // add entry to list
          if ( !title || !link ) return;
          this.addEntry( { type, title, link, date } );
        });

      })
      .catch( err => {
        this.handleError( type, url, err.message || `The request has failed` );
      });
    },

    // setup tabs and feed urls
    setupTabs() {
      this.addTab( 'all', 'All' );

      if ( window.blog_feed ) {
        const type = 'blog';
        this.addTab( type, 'Posts' );
        this.fetchRss( type, blog_feed );
      }
      if ( window.news_rss ) {
        const type = 'news';
        this.addTab( type, 'News' );
        this.fetchRss( type, news_rss );
      }
      if ( window.twitter_handle ) {
        const type = 'twitter';
        this.addTab( type, 'Twitter' );
        this.fetchRss( type, 'https://twitter.com/' + twitter_handle );
      }
      if ( window.reddit_sub ) {
        const type = 'reddit';
        this.addTab( type, 'Reddit' );
        this.fetchRss( type, 'https://www.reddit.com/r/' + reddit_sub + '.rss' );
      }
      if ( window.medium_handle ) {
        const type = 'medium';
        this.addTab( type, 'Medium' );
        this.fetchRss( type, 'https://medium.com/feed/@' + medium_handle );
      }
      if ( window.youtube_channel ) {
        const type = 'youtube';
        this.addTab( type, 'Youtube' );
        this.fetchRss( type, 'https://youtube.com/' + youtube_channel );
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
    this.errors = [];
    this.setupTabs();
  },

});
