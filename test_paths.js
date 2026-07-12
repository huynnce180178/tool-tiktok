const cookies = [
  'remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d=eyJpdiI6InZFdG1nRUhkMG5KZkRML1g3SnpSNXc9PSIsInZhbHVlIjoiUW5kRDBWTC9id2Fkd3Q0b2NyamRYTmlKMlZQSGQ4UmF5Y09NUWY3YnFJTjFZb05Db1VaeittbTc4eUw0WFU5Zmp0TDQ1NFBkcFpBejNodWtFdjE2b1QwMHBCeDZxQVpNaCs4ZFNSVWxvNjRoZGVmcGZPTVB6a2I2aGs3ZlZNVVFva0JPOW9Kdjh5endVcmlreHJtTEQ5Sk5FcDMzTkpVclZ1cS9ZRGlPWk83eVU0YkVHOCt6SUZXRjdkNVZKbEZiMklHRkZodjg1L00rejlVd29hL1JFZUlEQ0RMaXhyVUFOT1V1MklDaFN2bz0iLCJtYWMiOiI2NDk3NTI1N2VmYTI2M2Y1ZmRlYjliOGIzMzBiMDllNTgwZjhiOTI1NGRhOWVmZmUwMzg0ZGVjNDIzZGZjODVmIiwidGFnIjoiIn0%3D',
  'XSRF-TOKEN=eyJpdiI6Im9hOXF4d1M5Z29HY2YvakZnelhxdWc9PSIsInZhbHVlIjoiVDhJUkNkT0dxbkJiWTJWV0ZOamtsdFovQllKdHp4bmh3bGdyN0tRdzVseTRhWjJWbFg2Ti96UUM1RnA0VTdXcXZwSForRnQwTUVKdlI5a2JnMEhGQ1p2dStldVNVWFdVK1kxNXB2aktMMkczbnpIbHJKSy9Rc2Jza09xaVNKMEkiLCJtYWMiOiJlYWYzNTk3MGFjODk3NjliOGFhMGZmMDM3NjI5NDFjOWFmNGM5YjhlYTk2YzI4NmQ0ZjEwMGI0ZDg5ZjAyNDY2IiwidGFnIjoiIn0%3D',
  'likevn_session=eyJpdiI6IjJXbWxHMUFKeTRTQURkWDdDdDg1akE9PSIsInZhbHVlIjoiUkNPajdHMXNqRmw4c29pRlI0TUpWWWpXaUdvbjFmTnFycytJM0FmUzFjN1ZZTk5wRmdxUFk1NHQvL0s4bkF4VjVoY1B4M2hSaVNJcjBEMlEreE1lcytxanEyQis4UHE2YUVvQ0xyaFg1UGlTZlZBZ2o2Z25hK21oQ0g5Wk5MME4iLCJtYWMiOiJjOGViZWJlMzJhMDgwM2YzNTQ5MDI0OGFlMzllYmFkZWUwYWMwYTBjNTI3ZDljYTFiMGM0NDZiM2FmOWJkODBkIiwidGFnIjoiIn0%3D',
  'cf_clearance=kxE4BTVqhAyMKbtS3PJVPOJpTknYlLJrwifSdpGSEyQ-1783871828-1.2.1.1-13h02wVll4NIkkh820eO0Ajufj1T0p3XAf2DmzeJjcR6wEKq.D71rXUIO4Ahzwy3464Ktbn82L1YwXvvVjZdTBJWj6KMD1v1WyOFjKIb6VlSuXt49hq5.3_Q5IvkE.vHXIhLcwMn1Xgmx0IlvLL49OcJPcKSUeOKLB8T7c_LP75.FRTD.4spAp4PgiPldH6Y8n20p1IwSle7f8oSJQ4QtQ9Sh_c6OSDm3B7HvbFMQzZriFNnPUlCtY.Yq8wQEXr4R5vAJi7u.Wun.ddjEvHcGKxFBYIwwUya0XqrMM1i6mikC5PgYamzXirVGqQayJSRxkwPENCyaT96CGLTJipstg'
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
