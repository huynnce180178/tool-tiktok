const cookies = [
  'XSRF-TOKEN=eyJpdiI6ImhYaGRhVmRMWmR6bEdPaE8rcTlzREE9PSIsInZhbHVlIjoiakk2L2RzMFRkMlRnNFJoZVJ2bHlIVUFwYmxjSFVKNmswRkZKcTh0aFFWMmN3ZzJneXI1cGtoTDFkbERxQUxRRC85WHM3czZrOEYrMmE5czRFU1lrUFBJcjJvQkp3T1FuNTVsMnd6NnlHZnpZVUFZUzlvTkFNNEVhY3hJWFQ3Q2giLCJtYWMiOiJmMmRiMmY5MWYyMjAxYjJhNGU4NDk4OGY5OGNiMDNmNDFkMTdhMGZkMDllY2VmN2IxMmEwMjZiMjhiYTgxYTQyIiwidGFnIjoiIn0%3D',
  'likevn_session=eyJpdiI6InVGUlFaVThqbm1GZGhYS2N5VDZYL1E9PSIsInZhbHVlIjoiUzJRZTZXQStJaXRLL0RjU1Nxc2hqRXBseUlMZmtOQ2pPRG44bGkxTjhhcC9mK2o5WEhYcHBDd25hMkdEbzVSa1V5Uis1djRuMHQwVGF4N0NrSEJVdnVXK3JTSlFkbU9QRG1oS2lCWUhTeDZNR2J3N2pDWi9oTlpTVld6ditsYnYiLCJtYWMiOiIzZWI1ZDRkYzZkOWUwMzVhNjQwMmIwZTQ5ZTMxNThhYWQ4ZGFhZGVmYmMyMGRkM2M2NDU1NWUwNTAwNTJkMjJiIiwidGFnIjoiIn0%3D',
  'cf_clearance=bhYA6DoZBUvPZWTX3NA266BF48agxtddQZrroAunqyc-1784115271-1.2.1.1-Z3qmFdJGCaqMxTtYnaEo.plaGsnQ..xK82naZk_j22i5bQn7TA5AO9f63ZAxJeH1UYHT_OyqRBPlAINMFdIkbaTXppHKO7d0I8zuYk9VpL7XM3frwIO11PQ9ivIx.WwT1bFrcfL6sgGLUH4t1YhzHUOr7XjPLaYOoD1pWPx3JJ4jK1PiXts.o35Viox1El9Y8J7Y1pVqDa8_lPHEzwRjJdnvrPmqeVY9zixMcQtmt7bkl8xghkUTW4e.C1kGSHOddpQkFDPL2zRr3MEFdOD4z6aD_CHMG81pcvpc3T7byaI3ErSDX_WEm7.8zj8VbuIVb4hGWp3CYNQub0wnegrJwQ'
].join('; ');

const paths = [
  '/history',
  '/history/orders',
  '/orders-history',
  '/order-history',
  '/lich-su-mua',
  '/lich-su-don',
  '/lich-su',
  '/quan-ly-don',
  '/quan-ly',
  '/logs',
  '/log',
  '/user/history',
  '/user/orders',
  '/profile/history',
  '/profile/orders',
  '/orders/list',
  '/order/list',
  '/mua-history',
  '/mua-orders',
  '/danh-sach-don'
];

async function scanPaths() {
  console.log('Scanning common paths...');
  for (const path of paths) {
    const url = `https://like.vn${path}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
        redirect: 'manual' // Check for redirects (like login)
      });
      
      const status = response.status;
      if (status === 302 || status === 301) {
        console.log(`[REDIRECT ${status}] -> ${path} redirects to ${response.headers.get('location')}`);
        continue;
      }
      
      const text = await response.text();
      // Check if it's 404
      const is404 = text.includes('404') || text.includes('địa chỉ truy cập không tồn tại');
      
      if (!is404 && status === 200) {
        const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'No Title';
        console.log(`[SUCCESS 200] -> ${path} | Title: "${title}" | Size: ${text.length} chars`);
      } else {
        // console.log(`[404] -> ${path}`);
      }
    } catch (err) {
      console.error(`Error fetching ${path}:`, err.message);
    }
  }
  console.log('Scan completed.');
}

scanPaths();
