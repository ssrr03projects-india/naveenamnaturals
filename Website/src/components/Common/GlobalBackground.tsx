"use client";

import Image from "next/image";

export default function GlobalBackground() {
    return (
        <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
            <Image
                src="/images/bg/05.jpg"
                alt="Naveenam Naturals Background"
                fill
                className="object-cover opacity-[0.35]"
                sizes="100vw"
                quality={60}
                priority={false}
            />
        </div>
    );
}
