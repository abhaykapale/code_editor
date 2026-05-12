import React from "react";
import Image from "next/image";
import SignInForm from "@/modules/auth/components/sign-in-form-client";

const Page = () => {
  return (
    <div className="flex w-full max-w-4xl gap-8 items-center justify-center px-4">
      <div className="hidden md:block">
        <Image
          src="/signin.svg"
          alt="sign in image"
          width={400}
          height={400}
          priority
        />
      </div>
      <SignInForm />
    </div>
  );
};

export default Page;