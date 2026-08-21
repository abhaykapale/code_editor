import { LuGithub } from "react-icons/lu";

const socialLinks = [
  {
    href: "https://github.com/abhaykapale/code_editor",
    label: "GitHub",
    Icon: LuGithub,
  },
];

export function Footer() {
  return (
    <footer className='border-t border-zinc-200 dark:border-zinc-800'>
      <div className='mx-auto flex max-w-7xl flex-col items-center px-4 py-8 sm:px-6'>
        <div className='flex gap-4'>
          {socialLinks.map(({ href, label, Icon }) => (
            <a
              key={href}
              href={href}
              target='_blank'
              rel='noopener noreferrer'
              aria-label={label}
              className='text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'>
              <Icon className='h-5 w-5' aria-hidden='true' />
            </a>
          ))}
        </div>

        <p className='mt-4 text-sm text-zinc-500 dark:text-zinc-400'>
          &copy; {new Date().getFullYear()} Codesnippet. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
