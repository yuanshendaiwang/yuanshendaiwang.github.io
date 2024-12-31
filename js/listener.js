{
    const dom = document.querySelector('#fireworks')
    const options = {}

    const fireworks = new Fireworks(dom, options)
    fireworks.start()

    dom.addEventListener('click', (event) => {
      fireworks.createFirework(event.offsetX, event.offsetY)
    })
  }
  
  {
    const dom = document.querySelector('#word')
    const image = imageSrc
    const word = new Word(dom, image)
    word.start()
  }

  {
    
  }