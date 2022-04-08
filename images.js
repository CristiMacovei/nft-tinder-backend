const axios = require('axios')

axios.get('http://localhost:15623/next-image', {
  headers: {
    'Authorization': 'b97fb713a82f34d2dd35c30e137147a452a19d2625a10b550cf2bada0432c71b'
  }
})
.then(response => {
  console.log(response.data)
})