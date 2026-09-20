import React from 'react';

function Drawer({ children }) {
  return <div>{children}</div>;
}

export default function Test() {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      {open && (
        <Drawer>
          <div>
            <div>
              <div>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
