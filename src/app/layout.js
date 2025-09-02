import './../app/globals.css';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard with user management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-100">
        {children}
      </body>
    </html>
  );
}