import { signup, login, logout, getUser, handleAuthCallback } from 'https://esm.sh/@netlify/identity?bundle'

const params = new URLSearchParams(window.location.search)
const redirectTo = params.get('redirect') || 'index.html'

const $ = (s) => document.querySelector(s)
const $$ = (s) => Array.from(document.querySelectorAll(s))

const statusEl = $('#authStatus')
const accountBox = $('#accountBox')
const accountTitle = $('#accountTitle')
const accountMeta = $('#accountMeta')

function showStatus(msg, type='info'){
  statusEl.className = `status ${type} show`
  statusEl.textContent = msg
}

async function init(){
  await handleAuthCallback().catch(()=>{})
  const user = await getUser()

  if(user){
    accountBox.classList.remove('hidden')
    accountTitle.textContent = `Signed in as ${user.email}`
    accountMeta.innerHTML = `Logged in`
  }
}

$('#loginForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault()
  try{
    await login($('#loginEmail').value, $('#loginPassword').value)
    showStatus('Login successful','success')
    setTimeout(()=>window.location.href=redirectTo,500)
  }catch(err){
    showStatus('Login failed','error')
  }
})

$('#signupForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault()
  try{
    await signup($('#signupEmail').value, $('#signupPassword').value)
    showStatus('Check your email to confirm','success')
  }catch(err){
    showStatus('Signup failed','error')
  }
})

$('#logoutBtn')?.addEventListener('click', async ()=>{
  await logout()
  window.location.reload()
})

init()