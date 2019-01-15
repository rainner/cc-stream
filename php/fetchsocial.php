<?php
/**
 * Script for fetching, filtering and parsing
 * data form Coinpaprika.com
 */
$input  = 'https://coinpaprika.com/ajax/coins/';
$output = str_replace( '\\', '/', __DIR__ ) .'/coinsdata.json';
$uagent = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36';

$c = curl_init();
curl_setopt( $c, CURLOPT_URL, $input );
curl_setopt( $c, CURLOPT_REFERER, $input );
curl_setopt( $c, CURLOPT_CONNECTTIMEOUT, 30 );
curl_setopt( $c, CURLOPT_USERAGENT, $uagent );
curl_setopt( $c, CURLOPT_RETURNTRANSFER, 1 );
curl_setopt( $c, CURLOPT_FAILONERROR, 1 );
curl_setopt( $c, CURLOPT_FORBID_REUSE, 1 );
curl_setopt( $c, CURLOPT_SSL_VERIFYPEER, 0 );
curl_setopt( $c, CURLOPT_MAXREDIRS, 5 );

// parse, sort and slide json data response
$res  = json_decode( trim( curl_exec( $c ) ), true );
$sort = usort( $res, function( $a, $b ) { return intval( $a['rank'] ) > intval( $b['rank'] ); } );
$res  = array_slice( $res, 0, 200 );
$data = [];

// build new data object
foreach( $res as $coin ) {
  $data[ $coin['url_name'] ] = array(
    'name'   => $coin['name'],
    'rank'   => $coin['rank'],
    'symbol' => $coin['symbol'],
    'social' => $coin['social'],
  );
}

// build final output data and save to a file.
$json  = json_encode( $data );
$saved = file_put_contents( $output, $json );

// respond to a request with CORS support
if ( isset( $_SERVER['REMOTE_ADDR'] ) ) {
  http_response_code( 200 );
  header_remove( 'Server' );
  header_remove( 'X-Powered-By' );
  header( 'Access-Control-Allow-Origin: '. $_SERVER['REMOTE_ADDR'] );
  header( 'Access-Control-Allow-Credentials: true' );
  header( 'Access-Control-Max-Age: 86400' );

  if ( $_SERVER['REQUEST_METHOD'] === 'OPTIONS' ) {
    if ( isset( $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'] ) ) {
      header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
    }
    if ( isset( $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ) ) {
      header( 'Access-Control-Allow-Headers: '. $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] );
    }
  }
  if ( $_SERVER['REQUEST_METHOD'] === 'GET' ) {
    header( 'Content-Type: application/json' );
    echo $json;
  }
}
exit;
