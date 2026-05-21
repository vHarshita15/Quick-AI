const Footer = () => {
  return (
    <div className='text-gray-500/80 pt-8 px-6 md:px-16 lg:px-24 xl:px-32'>
      <div className='flex flex-wrap justify-between gap-12 md:gap-6'>

        <div className='max-w-80'>
          <img
            src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/dummyLogo/dummyLogoColored.svg"
            alt="logo"
            className='mb-4 h-8 md:h-9'
          />
          <p className='text-sm'>
            Experience the power of AI with Quick Ai. <br/>
            Transform your content creation with our suite of free AI tools. Write articles,
            generate images, and enhance your workflow.
          </p>

          {/* Social icons removed */}
        </div>

        {/* COMPANY and SUPPORT sections removed per request */}

        <div className='max-w-80'>
          <p className='text-lg text-gray-800'>STAY UPDATED</p>
          <p className='mt-3 text-sm'>
            Subscribe to our newsletter for inspiration and special offers.
          </p>

          <div className='flex items-center mt-4'>
            <input
              type="text"
              placeholder="Your email"
              className='bg-white rounded-l border border-gray-300 h-9 px-3 outline-none'
            />
            <button className='flex items-center justify-center bg-black h-9 w-9 rounded-r'>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 12H5m14 0-4 4m4-4-4-4"
                />
              </svg>
            </button>
          </div>
        </div>

      </div>

      <hr className='border-gray-300 mt-8' />

      <div className='flex flex-col md:flex-row gap-2 items-center justify-between py-5'>
        <p>
          © {new Date().getFullYear()}{' '}
          <a href="https://prebuiltui.com">PrebuiltUI</a>. All rights reserved.
        </p>
        <ul className='flex items-center gap-4'>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
          <li><a href="#">Sitemap</a></li>
        </ul>
      </div>

    </div>
  )
}

export default Footer
