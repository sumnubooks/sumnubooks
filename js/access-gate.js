import { getUser, handleAuthCallback } from 'https://esm.sh/@netlify/identity?bundle'

async function checkAccess(){
  await handleAuthCallback().catch(()=>{})

  const user = await getUser()

  if(!user){
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname)
    return
  }

  const roles = user?.app_metadata?.roles || []

  if(!roles.includes('vip')){
    window.location.href = 'unlock.html'
  }
}

checkAccess()